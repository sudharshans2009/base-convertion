/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
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
    if (fracPart) {
      for (let i = 0; i < fracPart.length; i++) {
        const digit = parseInt(fracPart[i], b);
        if (isNaN(digit)) return NaN;
        fracVal += digit / Math.pow(b, i + 1);
      }
    }
    return intVal + fracVal;
  };

  // convert a JS number to a string in base `b`, up to `precision` fractional digits
  const decimalToBase = (num: number, b: number, precision = 10): string => {
    const intVal = Math.floor(num);
    let frac = num - intVal;
    let res = intVal.toString(b).toUpperCase();
    if (frac === 0) return res;
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

    // handle trailing dot (e.g. "A." or "10.")
    const isTrailingDot = input.endsWith(".") && !input.includes("..");
    if (isTrailingDot) {
      // parse only integer part
      const intStr = input.slice(0, -1);
      const decInt = parseBaseToDecimal(intStr, activeBase);
      if (isNaN(decInt)) {
        // invalid integer -> show raw in active only
        setValues({ 2: "", 8: "", 10: "", 16: "", [activeBase]: input });
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

    if (input === "") {
      setValues({ 2: "", 8: "", 10: "", 16: "" });
      return;
    }

    const dec = parseBaseToDecimal(input, activeBase);
    if (isNaN(dec)) {
      // invalid input -> show it only in active, clear others
      setValues({ 2: "", 8: "", 10: "", 16: "", [activeBase]: input });
      return;
    }

    setValues({
      2: decimalToBase(dec, 2),
      8: decimalToBase(dec, 8),
      10: decimalToBase(dec, 10),
      16: decimalToBase(dec, 16),
    });
  };

  const handleViewProcess = (targetBase: number) => {
    // get the current input value from whichever base is active
    const rawInput = values[activeBase];
    if (!rawInput || rawInput === "") return;

    // parse the input to decimal first
    const dec = parseBaseToDecimal(rawInput.replace(/\.$/, ""), activeBase);
    if (isNaN(dec)) return;

    const intPart = Math.floor(dec);

    // generate conversion steps from activeBase to targetBase
    const steps: {
      operation: string;
      finalValue: string;
      isHighlight?: boolean;
    }[] = [];

    // if converting from non-decimal, first show conversion to decimal
    if (activeBase !== 10) {
      if (activeBase === 2) {
        // binary to decimal: show positional values
        const digits = rawInput.replace(/\s/g, "").split("").reverse();
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
        const digits = rawInput.split("").reverse();
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

    // if target is not decimal, show conversion from decimal to target
    if (targetBase !== 10) {
      let q = intPart;
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
      <h2>Base Converter</h2>
      <div className="legand">
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
                placeholder={activeBase === b.value ? `Enter ${b.label}` : ""}
              />
              <button
                className="view-process-btn"
                disabled={activeBase === b.value}
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
          <div className="legand">
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
                      className={row.isHighlight ? "highlight-row" : ""}
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
