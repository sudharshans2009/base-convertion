/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import "./BaseConverter.css";

const bases = [
  { label: "BIN", value: 2 },
  { label: "OCT", value: 8 },
  { label: "DEC", value: 10 },
  { label: "HEX", value: 16 },
];

const BaseConverter: React.FC = () => {
  const [activeBase, setActiveBase] = useState<number>(10);
  const [values, setValues] = useState<Record<number, string>>({
    2: "",
    8: "",
    10: "",
    16: "",
  });

  // for "view process" feature
  const [viewBase, setViewBase] = useState<number | null>(null);
  const [processSteps, setProcessSteps] = useState<string[]>([]);

  // Beta feature toggle
  const [betaMode, setBetaMode] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('baseConverter_betaMode');
    setBetaMode(saved === 'true');
  }, []);

  const toggleBetaMode = () => {
    const newBetaMode = !betaMode;
    setBetaMode(newBetaMode);
    localStorage.setItem('baseConverter_betaMode', newBetaMode.toString());
    
    // Clear fractional inputs when disabling beta
    if (!newBetaMode) {
      const newValues = { ...values };
      Object.keys(newValues).forEach(key => {
        if (newValues[parseInt(key)].includes('.')) {
          newValues[parseInt(key)] = newValues[parseInt(key)].split('.')[0];
        }
      });
      setValues(newValues);
    }
  };

  const handleButtonClick = (base: number) => {
    setActiveBase(base);
    setViewBase(null);
  };

  // convert a string in base `b` (with optional fractional part) to a JS number
  const parseBaseToDecimal = (str: string, b: number): number => {
    const [intPart, fracPart] = str.split(".");
    const intVal = intPart ? parseInt(intPart, b) : 0;
    if (isNaN(intVal)) return NaN;
    let fracVal = 0;
    if (fracPart && betaMode) {
      for (let i = 0; i < fracPart.length; i++) {
        const digit = parseInt(fracPart[i], b);
        if (isNaN(digit)) return NaN;
        fracVal += digit / Math.pow(b, i + 1);
      }
    }
    return intVal + fracVal;
  };

  // convert a JS number to a string in base `b`, up to `precision` fractional digits
  const decimalToBase = (num: number, b: number, precision = 4): string => {
    const intVal = Math.floor(num);
    let frac = num - intVal;
    let res = intVal.toString(b).toUpperCase();
    if (frac === 0 || !betaMode) return res;
    res += ".";
    for (let i = 0; i < precision; i++) {
      frac *= b;
      const digit = Math.floor(frac);
      res += digit.toString(b).toUpperCase();
      frac -= digit;
      if (frac === 0) break;
    }
    return res;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.trim();

    // Prevent fractional input if beta mode is off
    if (!betaMode && input.includes('.')) {
      return;
    }

    // Validate input characters for the current base
    const isValidInput = (value: string, base: number): boolean => {
      const cleanValue = value.replace(/\s/g, '').replace('.', ''); // Remove spaces and decimal point
      for (const char of cleanValue) {
        const digit = parseInt(char, base);
        if (isNaN(digit)) return false;
      }
      return true;
    };

    // Check if input contains invalid characters for the current base
    if (input !== '' && !isValidInput(input, activeBase)) {
      setValues({
        2: activeBase === 2 ? input : "Invalid Value",
        8: activeBase === 8 ? input : "Invalid Value", 
        10: activeBase === 10 ? input : "Invalid Value",
        16: activeBase === 16 ? input : "Invalid Value",
      });
      return;
    }

    // handle trailing dot (e.g. "A." or "10.")
    const isTrailingDot = input.endsWith(".") && !input.includes("..");
    if (isTrailingDot && betaMode) {
      // parse only integer part
      const intStr = input.slice(0, -1);
      if (!isValidInput(intStr, activeBase)) {
        setValues({
          2: activeBase === 2 ? input : "Invalid Value",
          8: activeBase === 8 ? input : "Invalid Value",
          10: activeBase === 10 ? input : "Invalid Value", 
          16: activeBase === 16 ? input : "Invalid Value",
        });
        return;
      }
      const decInt = parseBaseToDecimal(intStr, activeBase);
      if (isNaN(decInt)) {
        // invalid integer -> show raw in active only
        setValues({
          2: activeBase === 2 ? input : "Invalid Value",
          8: activeBase === 8 ? input : "Invalid Value",
          10: activeBase === 10 ? input : "Invalid Value",
          16: activeBase === 16 ? input : "Invalid Value",
        });
      } else {
        // convert integer part to each base and append the dot
        setValues({
          2: decimalToBase(decInt, 2) + ".",
          8: decimalToBase(decInt, 8) + ".",
          10: decimalToBase(decInt, 10) + ".",
          16: decimalToBase(decInt, 16) + ".",
        });
      }
      return;
    }

    // limit to max 4 digits after decimal in beta mode
    if (betaMode && input.includes('.')) {
      const fracPart = input.split('.')[1] || '';
      if (fracPart.length > 4) return;
    }

    if (input === "") {
      setValues({ 2: "", 8: "", 10: "", 16: "" });
      return;
    }

    const dec = parseBaseToDecimal(input, activeBase);
    if (isNaN(dec)) {
      // invalid input -> show it only in active, clear others
      setValues({
        2: activeBase === 2 ? input : "Invalid Value",
        8: activeBase === 8 ? input : "Invalid Value", 
        10: activeBase === 10 ? input : "Invalid Value",
        16: activeBase === 16 ? input : "Invalid Value",
      });
      return;
    }

    setValues({
      2: decimalToBase(dec, 2),
      8: decimalToBase(dec, 8),
      10: decimalToBase(dec, 10),
      16: decimalToBase(dec, 16),
    });
  };

  const generateFractionalSteps = (fracPart: string, fromBase: number, toBase: number): any[] => {
    const steps: any[] = [];
    
    if (fromBase !== 10) {
      // Converting fractional part from other base to decimal
      steps.push({
        operation: `Converting fractional part .${fracPart} to decimal:`,
        finalValue: '--',
        isHeader: true
      });
      
      let fracDecimal = 0;
      for (let i = 0; i < fracPart.length; i++) {
        const digit = parseInt(fracPart[i], fromBase);
        const divisor = Math.pow(fromBase, i + 1);
        const contribution = digit / divisor;
        fracDecimal += contribution;
        
        steps.push({
          operation: `${fracPart[i]} × ${fromBase}^(-${i + 1})`,
          finalValue: `${digit} ÷ ${divisor} = ${contribution.toFixed(6)}`
        });
      }
      
      steps.push({
        operation: 'Sum of fractional parts',
        finalValue: `${fracDecimal.toFixed(6)} (decimal)`,
        isHighlight: true
      });
    }
    
    if (toBase !== 10) {
      // Converting decimal fractional part to target base
      const decFrac = fromBase === 10 ? 
        parseFloat('0.' + fracPart) : 
        parseFloat(steps[steps.length - 1]?.finalValue.split(' ')[0] || '0');
      
      steps.push({
        operation: `Converting decimal ${decFrac.toFixed(6)} to base ${toBase}:`,
        finalValue: '--',
        isHeader: true
      });
      
      let frac = decFrac;
      const results: string[] = [];
      
      for (let i = 0; i < 4 && frac > 0; i++) {
        frac *= toBase;
        const digit = Math.floor(frac);
        const digitStr = toBase === 16 && digit >= 10 ? 
          String.fromCharCode(65 + digit - 10) : digit.toString();
        
        steps.push({
          operation: `${(frac / toBase).toFixed(6)} × ${toBase}`,
          finalValue: `${frac.toFixed(6)}, integer part: ${digitStr}`
        });
        
        results.push(digitStr);
        frac -= digit;
      }
      
      steps.push({
        operation: 'Read integer parts top-down',
        finalValue: `.${results.join('')} (base ${toBase})`,
        isHighlight: true
      });
    }
    
    return steps;
  };

  const handleViewProcess = (targetBase: number) => {
    // get the current input value from whichever base is active
    const rawInput = values[activeBase];
    if (!rawInput || rawInput === "") return;

    // parse the input to decimal first
    const dec = parseBaseToDecimal(rawInput.replace(/\.$/, ""), activeBase);
    if (isNaN(dec)) return;

    const [intPart, fracPart] = rawInput.replace(/\.$/, "").split(".");
    const intVal = Math.floor(dec);

    // generate conversion steps from activeBase to targetBase
    const steps: {
      operation: string;
      finalValue: string;
      isHighlight?: boolean;
      isHeader?: boolean;
    }[] = [];

    // if converting from non-decimal, first show conversion to decimal
    if (activeBase !== 10) {
      if (activeBase === 2) {
        // binary to decimal: show positional values
        const digits = intPart.replace(/\s/g, "").split("").reverse();
        digits.forEach((digit, i) => {
          const power = Math.pow(2, i);
          const product = parseInt(digit) * power;
          steps.push({
            operation: `${digit} × 2^${i}`,
            finalValue: `${digit} × ${power} = ${product}`,
          });
        });
        const sum = steps.reduce(
          (acc, step) => acc + parseInt(step.finalValue.split(" = ")[1]),
          0,
        );
        steps.push({
          operation: "Sum of all products",
          finalValue: `${sum} (decimal)`,
          isHighlight: true,
        });
      } else {
        // general base to decimal
        const digits = intPart.split("").reverse();
        digits.forEach((digit, i) => {
          const digitVal = parseInt(digit, activeBase);
          const power = Math.pow(activeBase, i);
          const product = digitVal * power;
          steps.push({
            operation: `${digit} × ${activeBase}^${i}`,
            finalValue: `${digitVal} × ${power} = ${product}`,
          });
        });
        const sum = steps.reduce(
          (acc, step) => acc + parseInt(step.finalValue.split(" = ")[1]),
          0,
        );
        steps.push({
          operation: "Sum of all products",
          finalValue: `${sum} (decimal)`,
          isHighlight: true,
        });
      }
    }

    // Add fractional conversion if in beta mode and fractional part exists
    if (betaMode && fracPart) {
      const fracSteps = generateFractionalSteps(fracPart, activeBase, targetBase);
      steps.push(...fracSteps);
    }

    // if target is not decimal, show conversion from decimal to target
    if (targetBase !== 10) {
      let q = intVal;
      if (q === 0) {
        steps.push({
          operation: `0 ÷ ${targetBase}`,
          finalValue: "Q: 0, R: 0",
        });
      } else {
        while (q > 0) {
          const r = q % targetBase;
          const nextQ = Math.floor(q / targetBase);
          const remainderStr =
            targetBase === 16 && r >= 10
              ? String.fromCharCode(65 + r - 10)
              : r.toString();
          steps.push({
            operation: `${q} ÷ ${targetBase}`,
            finalValue: `Q: ${nextQ}, R: ${remainderStr}`,
          });
          q = nextQ;
        }
      }

      // Add final result row
      const remainders = steps
        .filter((step) => step.operation.includes("÷"))
        .map((step) => step.finalValue.split("R: ")[1])
        .reverse()
        .join("");

      steps.push({
        operation: "Read remainders bottom-up",
        finalValue: `${remainders} (${
          bases.find((b) => b.value === targetBase)?.label
        })`,
        isHighlight: true,
      });
    }

    setProcessSteps([JSON.stringify(steps)]);
    setViewBase(targetBase);
  };

  return (
    <div className="converter">
      <div className="header-row">
        <h2>Base Converter</h2>
        <button 
          className={`beta-toggle ${betaMode ? 'active' : ''}`}
          onClick={toggleBetaMode}
        >
          Beta {betaMode ? 'ON' : 'OFF'}
        </button>
      </div>
      
      {betaMode && (
        <div className="beta-warning">
          ⚠️ Beta Mode: Fractional number conversion is extremely unstable and may produce incorrect results
        </div>
      )}
      
      <div className="legend">
        <h4>[?]: View Process</h4>
      </div>
      <div className="base-buttons">
        {bases.map((b) => (
          <button
            key={b.value}
            className={activeBase === b.value ? "active" : ""}
            onClick={() => handleButtonClick(b.value)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="inputs-grid">
        {bases.map((b) => (
          <div key={b.value} className="input-group">
            <label>{b.label}</label>
            <div className="input-container">
              <input
                type="text"
                value={values[b.value]}
                disabled={activeBase !== b.value}
                onChange={activeBase === b.value ? handleChange : undefined}
                placeholder={activeBase === b.value ? `Enter ${b.label}${betaMode ? ' (decimals allowed)' : ''}` : ""}
              />
              <button
                className="view-process-btn"
                disabled={activeBase === b.value || !values[b.value] || values[b.value] === "Invalid Value"}
                onClick={() => handleViewProcess(b.value)}
              >
                ?
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewBase !== null && (
        <div className="process-panel">
          <h3>
            Conversion to {bases.find((b) => b.value === viewBase)?.label}
          </h3>
          <div className="legend">
            <h4>[Q]: Quotient</h4>
            <h4>[R]: Remainder</h4>
          </div>
          <div className="table-container">
            <table className="process-table">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Final Value</th>
                </tr>
              </thead>
              <tbody>
                {JSON.parse(processSteps[0] || "[]").map(
                  (row: any, i: number) => (
                    <tr
                      key={i}
                      className={`${row.isHighlight ? "highlight-row" : ""} ${row.isHeader ? "header-row" : ""}`}
                    >
                      <td>{row.operation}</td>
                      <td>{row.finalValue}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <button className="close-process" onClick={() => setViewBase(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default BaseConverter;
