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
    jsonString = jsonString.replace(/ObjectId\("([^"]*)"\)/g, '"ObjectId:$1"');
    jsonString = jsonString.replace(/NumberInt\((\d+)\)/g, '"NumberInt:$1"');

    return JSON.parse(jsonString, (key, value) => {
        if (typeof value === 'string') {
            if (value.startsWith('ObjectId:') || value.startsWith('NumberInt:')) {
                return value;
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
                    displayValue = `<span class="red value">${JSON.stringify(value.value)}</span>`;
                } else if (value.status === 'only_in_second') {
                    displayValue = `<span class="green value">${JSON.stringify(value.value)}</span>`;
                } else if (value.status === 'different') {
                    displayValue = `<span class="red value">${JSON.stringify(value.value1)}</span> | <span class="green value">${JSON.stringify(value.value2)}</span>`;
                } else if (value.status === 'same') {
                    displayValue = `<span class="value">${JSON.stringify(value.value)}</span>`;
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
        const jsonObj = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(jsonObj, null, 2);
    } catch (error) {
        alert(`Invalid JSON in textarea ${textareaId}: ${error.message}`);
    }
}
