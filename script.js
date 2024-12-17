import React, { useState, useEffect } from 'react';
import { Sun, Moon, Upload, Download, Search, ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import _ from 'lodash';

const JsonDiffChecker = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [json1, setJson1] = useState('');
  const [json2, setJson2] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleFileUpload = async (e, setJson) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      setJson(text);
    }
  };

  const handleCompare = () => {
    setLoading(true);
    setError(null);
    try {
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      const diffResult = compareObjects(obj1, obj2);
      setResult(diffResult);
      setStats(calculateDiffStats(diffResult));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const compareObjects = (obj1, obj2) => {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      return compareArrays(obj1, obj2);
    }

    const result = {};
    const allKeys = [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])];

    allKeys.forEach(key => {
      if (key in obj1 && key in obj2) {
        if (_.isObject(obj1[key]) && _.isObject(obj2[key])) {
          result[key] = compareObjects(obj1[key], obj2[key]);
        } else if (_.isEqual(obj1[key], obj2[key])) {
          result[key] = { value: obj1[key], status: 'same' };
        } else {
          result[key] = { value1: obj1[key], value2: obj2[key], status: 'different' };
        }
      } else if (key in obj1) {
        result[key] = { value: obj1[key], status: 'removed' };
      } else {
        result[key] = { value: obj2[key], status: 'added' };
      }
    });

    return result;
  };

  const compareArrays = (arr1, arr2) => {
    return arr1.map((item, i) => {
      if (i >= arr2.length) return { value: item, status: 'removed' };
      if (_.isEqual(item, arr2[i])) return { value: item, status: 'same' };
      if (_.isObject(item) && _.isObject(arr2[i])) return compareObjects(item, arr2[i]);
      return { value1: item, value2: arr2[i], status: 'different' };
    });
  };

  const calculateDiffStats = (diff) => {
    const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    const countDiffs = (obj) => {
      Object.values(obj).forEach(value => {
        if (value.status === 'added') stats.added++;
        else if (value.status === 'removed') stats.removed++;
        else if (value.status === 'different') stats.modified++;
        else if (value.status === 'same') stats.unchanged++;
        else if (_.isObject(value)) countDiffs(value);
      });
    };
    countDiffs(diff);
    return stats;
  };

  const renderDiff = (diff, path = '') => {
    if (!diff) return null;
    
    const isExpanded = expandedPaths.has(path);
    const toggleExpand = () => {
      const newPaths = new Set(expandedPaths);
      if (isExpanded) newPaths.delete(path);
      else newPaths.add(path);
      setExpandedPaths(newPaths);
    };

    return (
      <div className="ml-4">
        {Object.entries(diff).map(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          const isSearchMatch = searchTerm && currentPath.toLowerCase().includes(searchTerm.toLowerCase());
          
          return (
            <div 
              key={currentPath} 
              className={`py-1 ${isSearchMatch ? 'bg-yellow-100 dark:bg-yellow-900' : ''}`}
            >
              <div className="flex items-center">
                {_.isObject(value) && !value.status && (
                  <button onClick={toggleExpand} className="p-1">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
                <span className="font-mono">
                  {key}:
                </span>
                {value.status ? (
                  <span className={`ml-2 ${getStatusColor(value.status)}`}>
                    {renderValue(value)}
                  </span>
                ) : isExpanded ? (
                  renderDiff(value, currentPath)
                ) : (
                  <span className="ml-2 text-gray-500">...</span>
                )}
                <button 
                  onClick={() => navigator.clipboard.writeText(currentPath)}
                  className="ml-2 opacity-50 hover:opacity-100"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'added': return 'text-green-600 dark:text-green-400';
      case 'removed': return 'text-red-600 dark:text-red-400';
      case 'different': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-800 dark:text-gray-200';
    }
  };

  const renderValue = (value) => {
    if (value.status === 'different') {
      return (
        <span>
          <span className="text-red-600 dark:text-red-400">{JSON.stringify(value.value1)}</span>
          {' → '}
          <span className="text-green-600 dark:text-green-400">{JSON.stringify(value.value2)}</span>
        </span>
      );
    }
    return JSON.stringify(value.value);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="container mx-auto p-4 dark:bg-gray-900 dark:text-white">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">MongoDB JSON Diff Checker</h1>
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* JSON Input 1 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">JSON 1</h2>
              <label className="cursor-pointer">
                <Upload size={20} />
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setJson1)}
                  accept=".json"
                />
              </label>
            </div>
            <textarea
              className="w-full h-64 p-2 font-mono text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
              value={json1}
              onChange={(e) => setJson1(e.target.value)}
              placeholder="Paste your first JSON here..."
            />
          </div>

          {/* JSON Input 2 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">JSON 2</h2>
              <label className="cursor-pointer">
                <Upload size={20} />
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setJson2)}
                  accept=".json"
                />
              </label>
            </div>
            <textarea
              className="w-full h-64 p-2 font-mono text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
              value={json2}
              onChange={(e) => setJson2(e.target.value)}
              placeholder="Paste your second JSON here..."
            />
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <button
            onClick={handleCompare}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Comparing...' : 'Compare JSONs'}
          </button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            {/* Diff Stats */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-center">
                <div className="text-green-600 dark:text-green-400 font-bold">{stats.added}</div>
                <div className="text-sm">Added</div>
              </div>
              <div className="text-center">
                <div className="text-red-600 dark:text-red-400 font-bold">{stats.removed}</div>
                <div className="text-sm">Removed</div>
              </div>
              <div className="text-center">
                <div className="text-orange-600 dark:text-orange-400 font-bold">{stats.modified}</div>
                <div className="text-sm">Modified</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 dark:text-gray-400 font-bold">{stats.unchanged}</div>
                <div className="text-sm">Unchanged</div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by JSON path..."
                className="w-full pl-10 pr-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Diff View */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
              {renderDiff(result)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonDiffChecker;