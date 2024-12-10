function validateJSON(textareaId) {
    const textarea = document.getElementById(`json${textareaId}`);
    const warningContainer = document.getElementById(`warnings${textareaId}`);
    warningContainer.innerHTML = '';
    
    // Remove previous error indicators
    const existingIndicators = textarea.parentNode.querySelectorAll('.error-indicator');
    existingIndicators.forEach(indicator => indicator.remove());

    try {
        parseMongoJSON(textarea.value);
        textarea.classList.remove('invalid-json');
    } catch (error) {
        textarea.classList.add('invalid-json');
        const errorMessage = error.message;
        warningContainer.innerHTML = `<div class="warning">${errorMessage}</div>`;

        // Extract line number from error message
        const lineMatch = errorMessage.match(/line (\d+)/);
        if (lineMatch) {
            const lineNumber = parseInt(lineMatch[1], 10);
            highlightErrorLine(textarea, lineNumber);
        } else {
            // Extract position from error message
            const positionMatch = errorMessage.match(/position (\d+)/);
            if (positionMatch) {
                const position = parseInt(positionMatch[1], 10);
                const lineNumber = calculateLineNumberFromPosition(textarea.value, position);
                highlightErrorLine(textarea, lineNumber);
            }
        }
    }
}

function calculateLineNumberFromPosition(text, position) {
    const lines = text.substring(0, position).split('\n');
    return lines.length; // The line number where the error occurred
}

function highlightErrorLine(textarea, lineNumber) {
    const lines = textarea.value.split('\n');
    if (lineNumber > 0 && lineNumber <= lines.length) {
        const errorLine = lines[lineNumber - 1];
        const precedingText = lines.slice(0, lineNumber - 1).join('\n');
        const errorLineStart = precedingText.length + (precedingText ? 1 : 0); // +1 for newline, if any

        // Create and position the error indicator
        const indicator = document.createElement('div');
        indicator.className = 'error-indicator';
        indicator.textContent = '⚠️'; // Unicode warning symbol
        
        const { top, left } = getErrorIndicatorPosition(textarea, errorLineStart);
        indicator.style.top = `${top}px`;
        indicator.style.left = `${left}px`;

        textarea.parentNode.appendChild(indicator);
    }
}

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
    // Handle MongoDB-specific types
    jsonString = jsonString.replace(/ObjectId\("([^"]*)"\)/g, '"ObjectId:$1"');
    jsonString = jsonString.replace(/NumberInt\((\d+)\)/g, '"NumberInt:$1"');
    jsonString = jsonString.replace(/NumberLong\((\d+)\)/g, '"NumberLong:$1"');
    jsonString = jsonString.replace(/ISODate\("([^"]*)"\)/g, '"ISODate:$1"');

    return JSON.parse(jsonString, (key, value) => {
        if (typeof value === 'string') {
            if (value.startsWith('ObjectId:')) {
                return { $type: 'ObjectId', $value: value.slice(9) };
            } else if (value.startsWith('NumberInt:')) {
                return { $type: 'NumberInt', $value: parseInt(value.slice(10)) };
            } else if (value.startsWith('NumberLong:')) {
                return { $type: 'NumberLong', $value: parseInt(value.slice(10)) };
            } else if (value.startsWith('ISODate:')) {
                return { $type: 'ISODate', $value: value.slice(8) };
            }
        }
        return value;
    });
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

function displayResult(result) {
    const outputDiv = document.getElementById('output');

    function stringifyWithColor(obj, indent = 0) {
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            let output = '[\n';
            for (let i = 0; i < obj.length; i++) {
                const padding = ' '.repeat(indent + 2);
                output += padding + stringifyWithColor(obj[i], indent + 2);
                if (i < obj.length - 1) output += ',';
                output += '\n';
            }
            output += ' '.repeat(indent) + ']';
            return output;
        }

        if (typeof obj !== 'object' || obj === null) {
            return JSON.stringify(obj);
        }

        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';

        let output = '{\n';
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = obj[key];
            const padding = ' '.repeat(indent + 2);

            output += `${padding}<span class="key">"${key}"</span>: `;

            if (typeof value === 'object' && value !== null && !('status' in value)) {
                output += stringifyWithColor(value, indent + 2);
            } else if (value && typeof value === 'object' && 'status' in value) {
                if (value.status === 'only_in_first') {
                    output += `<span class="red value">${stringifyMongoJSON(value.value, indent + 2)}</span>`;
                } else if (value.status === 'only_in_second') {
                    output += `<span class="green value">${stringifyMongoJSON(value.value, indent + 2)}</span>`;
                } else if (value.status === 'different') {
                    output += `<span class="red value">${stringifyMongoJSON(value.value1, indent + 2)}</span> <span class="diff-separator">|</span> <span class="green value">${stringifyMongoJSON(value.value2, indent + 2)}</span>`;
                } else if (value.status === 'same') {
                    output += `<span class="value">${stringifyMongoJSON(value.value, indent + 2)}</span>`;
                }
            } else {
                output += `<span class="value">${stringifyMongoJSON(value, indent + 2)}</span>`;
            }

            if (i < keys.length - 1) output += ',';
            output += '\n';
        }
        output += ' '.repeat(indent) + '}';
        return output;
    }

    const coloredJson = stringifyWithColor(result);
    outputDiv.innerHTML = coloredJson;
}

function stringifyMongoJSON(obj, indent = 0) {
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && '$type' in value && '$value' in value) {
            switch(value.$type) {
                case 'ObjectId':
                    return `ObjectId("${value.$value}")`;
                case 'NumberInt':
                    return `NumberInt(${value.$value})`;
                case 'NumberLong':
                    return `NumberLong(${value.$value})`;
                case 'ISODate':
                    return `ISODate("${value.$value}")`;
            }
        }
        return value;
    }, indent)
    .replace(/^/gm, ' '.repeat(indent)) // Add indentation to each line
    .replace(/\\n/g, '\n' + ' '.repeat(indent)); // Handle newlines within strings
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

function formatJSON(textareaId) {
    const textarea = document.getElementById(`json${textareaId}`);
    try {
        let jsonObj = parseMongoJSON(textarea.value);
        let formattedJson = stringifyMongoJSON(jsonObj);
        textarea.value = formattedJson;
        validateJSON(textareaId);
    } catch (error) {
        alert(`Invalid JSON in textarea ${textareaId}: ${error.message}`);
    }
}

// Initialize validation on page load
document.addEventListener('DOMContentLoaded', function() {
    validateJSON('1');
    validateJSON('2');
    
    // Add event listeners for textarea changes
    document.getElementById('json1').addEventListener('input', () => validateJSON('1'));
    document.getElementById('json2').addEventListener('input', () => validateJSON('2'));
});

// Add window resize listener
window.addEventListener('resize', () => {
    validateJSON('1');
    validateJSON('2');
});