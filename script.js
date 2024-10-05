function compareJSON() {
    const json1 = document.getElementById('json1').value;
    const json2 = document.getElementById('json2').value;
    const outputDiv = document.getElementById('output');
    const outputContainer = document.getElementById('output-container');

    try {
        const obj1 = parseMongoJSON(json1);
        const obj2 = parseMongoJSON(json2);
        const result = compareObjects(obj1, obj2);
        displayResult(result);
        outputContainer.classList.add('show');
        outputDiv.classList.add('fade-in');
    } catch (error) {
        outputDiv.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
        outputContainer.classList.add('show');
        outputDiv.classList.add('fade-in');
    }
}

function parseMongoJSON(jsonString) {
    // First, replace MongoDB-specific types with placeholder strings
    jsonString = jsonString.replace(/ObjectId\("([^"]*)"\)/g, '"ObjectId:$1"');
    jsonString = jsonString.replace(/NumberInt\((\d+)\)/g, '"NumberInt:$1"');
    jsonString = jsonString.replace(/ISODate\("([^"]*)"\)/g, '"ISODate:$1"');

    // Parse the modified JSON string
    const parsed = JSON.parse(jsonString);

    // Recursive function to replace placeholder strings with actual objects
    function reviver(key, value) {
        if (typeof value === 'string') {
            if (value.startsWith('ObjectId:')) {
                return { $type: 'ObjectId', $value: value.slice(9) };
            } else if (value.startsWith('NumberInt:')) {
                return { $type: 'NumberInt', $value: parseInt(value.slice(10)) };
            } else if (value.startsWith('ISODate:')) {
                return { $type: 'ISODate', $value: value.slice(8) };
            }
        }
        return value;
    }

    // Apply the reviver function to the parsed object
    return JSON.parse(JSON.stringify(parsed), reviver);
}

// Update stringifyMongoJSON function as well
function stringifyMongoJSON(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && '$type' in value && '$value' in value) {
            switch(value.$type) {
                case 'ObjectId':
                    return `ObjectId("${value.$value}")`;
                case 'NumberInt':
                    return `NumberInt(${value.$value})`;
                case 'ISODate':
                    return `ISODate("${value.$value}")`;
            }
        }
        return value;
    }, 2);
}

function compareObjects(obj1, obj2) {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        return compareArrays(obj1, obj2);
    }

    const result = {};

    function compare(o1, o2, current) {
        const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);

        for (const key of allKeys) {
            if (key in o1 && key in o2) {
                if (typeof o1[key] === 'object' && o1[key] !== null &&
                    typeof o2[key] === 'object' && o2[key] !== null) {
                    current[key] = compareObjects(o1[key], o2[key]);
                } else if (JSON.stringify(o1[key]) === JSON.stringify(o2[key])) {
                    current[key] = { value: o1[key], status: 'same' };
                } else {
                    current[key] = { value1: o1[key], value2: o2[key], status: 'different' };
                }
            } else if (key in o1) {
                current[key] = { value: o1[key], status: 'only_in_first' };
            } else {
                current[key] = { value: o2[key], status: 'only_in_second' };
            }
        }
    }

    compare(obj1, obj2, result);
    return result;
}

function compareArrays(arr1, arr2) {
    const result = [];
    const maxLength = Math.max(arr1.length, arr2.length);

    for (let i = 0; i < maxLength; i++) {
        if (i < arr1.length && i < arr2.length) {
            if (typeof arr1[i] === 'object' && arr1[i] !== null &&
                typeof arr2[i] === 'object' && arr2[i] !== null) {
                result.push(compareObjects(arr1[i], arr2[i]));
            } else if (JSON.stringify(arr1[i]) === JSON.stringify(arr2[i])) {
                result.push({ value: arr1[i], status: 'same' });
            } else {
                result.push({ value1: arr1[i], value2: arr2[i], status: 'different' });
            }
        } else if (i < arr1.length) {
            result.push({ value: arr1[i], status: 'only_in_first' });
        } else {
            result.push({ value: arr2[i], status: 'only_in_second' });
        }
    }

    return result;
}

function displayResult(result) {
    const outputDiv = document.getElementById('output');

    function stringifyWithColor(obj, indent = 0) {
        if (Array.isArray(obj)) {
            let output = '[\n';
            for (const item of obj) {
                const padding = ' '.repeat(indent + 2);
                output += padding + stringifyWithColor(item, indent + 2) + ',\n';
            }
            if (output.endsWith(',\n')) {
                output = output.slice(0, -2) + '\n';
            }
            output += ' '.repeat(indent) + ']';
            return output;
        }

        if (typeof obj !== 'object' || obj === null) {
            return JSON.stringify(obj);
        }

        let output = '{\n';
        for (const [key, value] of Object.entries(obj)) {
            const padding = ' '.repeat(indent + 2);
            let displayValue = '';

            output += `${padding}<span class="key">"${key}"</span>: `;
            if (typeof value === 'object' && !('status' in value)) {
                output += stringifyWithColor(value, indent + 2);
            } else {
                if (value.status === 'only_in_first') {
                    displayValue = `<span class="red value">${stringifyMongoJSON(value.value)}</span>`;
                } else if (value.status === 'only_in_second') {
                    displayValue = `<span class="green value">${stringifyMongoJSON(value.value)}</span>`;
                } else if (value.status === 'different') {
                    displayValue = `<span class="red value">${stringifyMongoJSON(value.value1)}</span> | <span class="green value">${stringifyMongoJSON(value.value2)}</span>`;
                } else if (value.status === 'same') {
                    displayValue = `<span class="value">${stringifyMongoJSON(value.value)}</span>`;
                }
                output += displayValue;
            }
            output += ',\n';
        }
        output = output.slice(0, -2) + '\n'; // Remove last comma and add newline
        output += ' '.repeat(indent) + '}';
        return output;
    }

    const coloredJson = stringifyWithColor(result);
    outputDiv.innerHTML = coloredJson;
}

function formatJSON(textareaId) {
    const textarea = document.getElementById(`json${textareaId}`);
    try {
        // Parse the MongoDB-style JSON
        let jsonObj = parseMongoJSON(textarea.value);
        
        // Stringify it back with proper formatting
        let formattedJson = stringifyMongoJSON(jsonObj);
        
        textarea.value = formattedJson;
    } catch (error) {
        alert(`Invalid JSON in textarea ${textareaId}: ${error.message}`);
    }
    updateLineNumbers(textareaId);
}

function updateLineNumbers(textareaId) {
    const textarea = document.getElementById(`json${textareaId}`);
    const lineNumbers = document.getElementById(`lineNumbers${textareaId}`);
    const lines = textarea.value.split('\n');
    
    // Create a hidden div to measure text width
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        height: auto;
        width: ${textarea.clientWidth}px;
        font-family: ${getComputedStyle(textarea).fontFamily};
        font-size: ${getComputedStyle(textarea).fontSize};
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
    `;
    document.body.appendChild(hiddenDiv);

    let lineNumbersHTML = '';
    lines.forEach((line, index) => {
        hiddenDiv.textContent = line;
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
        const wrappedLines = Math.ceil(hiddenDiv.clientHeight / lineHeight);
        
        lineNumbersHTML += `<span>${index + 1}</span>`;
        for (let i = 1; i < wrappedLines; i++) {
            lineNumbersHTML += '<span></span>';
        }
    });

    lineNumbers.innerHTML = lineNumbersHTML;
    document.body.removeChild(hiddenDiv);
}

function syncScroll(textareaId) {
    const textarea = document.getElementById(`json${textareaId}`);
    const lineNumbers = document.getElementById(`lineNumbers${textareaId}`);
    lineNumbers.scrollTop = textarea.scrollTop;
}

// Initialize line numbers and add event listeners
document.addEventListener('DOMContentLoaded', function() {
    const textareas = ['json1', 'json2'];
    
    textareas.forEach(id => {
        const textarea = document.getElementById(id);
        const lineNumbersId = `lineNumbers${id.slice(-1)}`;
        
        updateLineNumbers(id.slice(-1));
        
        textarea.addEventListener('input', () => {
            updateLineNumbers(id.slice(-1));
            syncScroll(id.slice(-1));
        });
        textarea.addEventListener('scroll', () => syncScroll(id.slice(-1)));
        
        // Handle window resize
        window.addEventListener('resize', () => {
            updateLineNumbers(id.slice(-1));
            syncScroll(id.slice(-1));
        });
        
        // Prevent the line numbers from scrolling independently
        document.getElementById(lineNumbersId).addEventListener('scroll', (e) => {
            e.preventDefault();
            e.target.scrollTop = textarea.scrollTop;
        });
        
        // Trigger initial scroll sync
        syncScroll(id.slice(-1));
    });
});