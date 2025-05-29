"use strict";

let dialDist  = undefined;
let mffToDial = undefined;
let mrfToDial = undefined;
let sffToDial = undefined;
let srfToDial = undefined;
let totalDist = undefined;
let mTIR      = undefined;
let sTIR      = undefined;
let validDist = false;

// Unit system: 'inches' or 'mm'
let currentUnits = 'inches';

// Conversion factors
const INCH_TO_MM = 25.4;
const MIL_TO_MICRON = 25.4;

// No watermark
let bkImg = null;
let bkOp  = 0;

let mode = 0; //0=basic mode, any other value is advanced mode.

//Create the dials and plot for single page mode.
let sDial = new Dial(document.getElementById("sp-stationary-dial"), {
    theme: {
        primary: "#F44336",
        secondary: "#D32F2F",
        accent: "#EF5350",
        needle: "#B71C1C"
    }
});
let mDial = new Dial(document.getElementById("sp-movable-dial"), {
    theme: {
        primary: "#2196F3",
        secondary: "#1976D2",
        accent: "#64B5F6",
        needle: "#0D47A1"
    }
});
let plot  = new ShaftPlot(document.getElementById("sp-plot"), {backgroundImg: bkImg, backgroundAlpha: bkOp});

// Unit conversion functions
function getMinValue() {
    return currentUnits === 'inches' ? 0.1 : 2.54; // 0.1 inches = 2.54 mm
}

function getMaxValue() {
    return currentUnits === 'inches' ? 100 : 2540; // 100 inches = 2540 mm
}

function getTIRMin() {
    return currentUnits === 'inches' ? -99 : -2515; // -99 mils = -2515 micrometers
}

function getTIRMax() {
    return currentUnits === 'inches' ? 99 : 2515; // 99 mils = 2515 micrometers
}

function convertValue(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) return value;
    
    if (fromUnit === 'inches' && toUnit === 'mm') {
        return value * INCH_TO_MM;
    } else if (fromUnit === 'mm' && toUnit === 'inches') {
        return value / INCH_TO_MM;
    } else if (fromUnit === 'mils' && toUnit === 'micrometers') {
        return value * MIL_TO_MICRON;
    } else if (fromUnit === 'micrometers' && toUnit === 'mils') {
        return value / MIL_TO_MICRON;
    }
    
    return value;
}

function updateUnitsDisplay() {
    const dimensionUnit = currentUnits;
    const tirUnit = currentUnits === 'inches' ? 'mils' : 'μm';
    
    // Update dimension units
    document.querySelectorAll('#unit-a, #unit-b, #unit-c, #unit-d, #unit-e, #unit-f').forEach(el => {
        el.textContent = dimensionUnit;
    });
    
    // Update TIR units
    document.querySelectorAll('#unit-s-tir, #unit-m-tir, #unit-s-half, #unit-m-half, #unit-m-neg').forEach(el => {
        el.textContent = tirUnit;
    });
    
    // Update range descriptions
    const dimRange = currentUnits === 'inches' ? '(0.1 - 100 inches)' : '(2.54 - 2540 mm)';
    const tirRange = currentUnits === 'inches' ? '(-99 to 99 mils)' : '(-2515 to 2515 μm)';
    
    document.getElementById('range-a').textContent = `Distance between dials ${dimRange}`;
    document.getElementById('range-b').textContent = `Movable front feet to dial (> A)`;
    document.getElementById('range-c').textContent = `Movable rear feet to dial (> B)`;
    document.getElementById('range-d').textContent = `Stationary front feet to dial ${dimRange}`;
    document.getElementById('range-e').textContent = `Stationary rear feet to dial (> D)`;
    document.getElementById('range-s-tir').textContent = `TIR reading ${tirRange}`;
    document.getElementById('range-m-tir').textContent = `TIR reading ${tirRange}`;
    
    // Update input attributes
    const inputs = ['dial-dist', 'mff-to-dial', 'mrf-to-dial', 'sff-to-dial', 'srf-to-dial'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.min = getMinValue();
            input.max = getMaxValue();
            input.step = currentUnits === 'inches' ? '0.1' : '0.1';
        }
    });
    
    const tirInputs = ['s-tir', 'm-tir'];
    tirInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.min = getTIRMin();
            input.max = getTIRMax();
            input.step = currentUnits === 'inches' ? '0.01' : '1';
        }
    });
}

function changeUnits(newUnit) {
    const oldUnit = currentUnits;
    currentUnits = newUnit;
    
    // Convert existing values
    const dimensionInputs = ['dial-dist', 'mff-to-dial', 'mrf-to-dial', 'sff-to-dial', 'srf-to-dial'];
    dimensionInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value) {
            const oldValue = parseFloat(input.value);
            const newValue = convertValue(oldValue, oldUnit, newUnit);
            input.value = newValue.toFixed(currentUnits === 'inches' ? 2 : 1);
            input.classList.add('unit-converting');
            setTimeout(() => input.classList.remove('unit-converting'), 1000);
        }
    });
    
    const tirInputs = ['s-tir', 'm-tir'];
    const oldTirUnit = oldUnit === 'inches' ? 'mils' : 'micrometers';
    const newTirUnit = newUnit === 'inches' ? 'mils' : 'micrometers';
    
    tirInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input && input.value) {
            const oldValue = parseFloat(input.value);
            const newValue = convertValue(oldValue, oldTirUnit, newTirUnit);
            input.value = newValue.toFixed(currentUnits === 'inches' ? 2 : 0);
            input.classList.add('unit-converting');
            setTimeout(() => input.classList.remove('unit-converting'), 1000);
        }
    });
    
    // Update display
    updateUnitsDisplay();
    
    // Recalculate everything
    updateCalculations();
}

function updateCalculations() {
    // Get current values from single page inputs
    dialDist  = parseFloat(document.getElementById("sp-dim-a").value) || undefined;
    mffToDial = parseFloat(document.getElementById("sp-dim-b").value) || undefined;
    mrfToDial = parseFloat(document.getElementById("sp-dim-c").value) || undefined;
    sffToDial = parseFloat(document.getElementById("sp-dim-d").value) || undefined;
    srfToDial = parseFloat(document.getElementById("sp-dim-e").value) || undefined;
    sTIR      = parseFloat(document.getElementById("sp-s-tir").value) || undefined;
    mTIR      = parseFloat(document.getElementById("sp-m-tir").value) || undefined;
    
    // Update calculated TIR values
    updateSinglePageTIRCalculations();
    
    // Update dials
    if(sDial && sTIR !== undefined) {
        sDial.setDial(sTIR);
    }
    if(mDial && mTIR !== undefined) {
        mDial.setDial(mTIR);
    }
    
    // Calculate and display results if all values are present
    if(dialDist && mffToDial && mrfToDial && sffToDial && srfToDial && sTIR !== undefined && mTIR !== undefined) {
        console.log("All values present, calculating...", {dialDist, mffToDial, mrfToDial, sffToDial, srfToDial, sTIR, mTIR});
        
        if(plot) {
            const dims = {
                dimA: dialDist,
                dimB: mffToDial,
                dimC: mrfToDial,
                dimD: sffToDial,
                dimE: srfToDial,
                sTIR: sTIR,
                mTIR: mTIR
            };
            plot.doCalcs(dims.dimA, dims.dimB, dims.dimC, dims.dimD, dims.dimE, dims.sTIR, dims.mTIR);
            console.log("Calculated successfully, plot data:", plot.dims);
            displaySinglePageResults(plot);
        } else {
            console.error("Plot object not initialized");
        }
    } else {
        console.log("Missing values - dialDist:", dialDist, "mffToDial:", mffToDial, "mrfToDial:", mrfToDial, "sffToDial:", sffToDial, "srfToDial:", srfToDial, "sTIR:", sTIR, "mTIR:", mTIR);
    }
}

// Test function to fill all values
function testFillAllValues() {
    document.getElementById("sp-dim-a").value = "10";
    document.getElementById("sp-dim-b").value = "15";
    document.getElementById("sp-dim-c").value = "25";
    document.getElementById("sp-dim-d").value = "8";
    document.getElementById("sp-dim-e").value = "18";
    document.getElementById("sp-s-tir").value = "5";
    document.getElementById("sp-m-tir").value = "-3";
    updateCalculations();
}

//Callback function for updating cost data.
let changeCostData = (costKwh, voltage, mult, period, title, comments) =>
{
    //Get references to cost data HTML elements.
    let txtCostKwh = document.getElementById("kwh");
    let txtVoltage = document.getElementById("volt");
    let txtMult    = document.getElementById("mult");
    let radWeek    = document.getElementById("weekly-radio");
    let radMonth   = document.getElementById("monthly-radio");
    let radYear    = document.getElementById("yearly-radio");
    
    //Add report title and comments.
    if(document.getElementById("report-title")) {
        document.getElementById("report-title").value = title;
    }
    if(document.getElementById("report-comments")) {
        document.getElementById("report-comments").value = comments;
    }

    //Update text on the screen.
    if(txtCostKwh) isNaN(costKwh) ? txtCostKwh.value = "" : txtCostKwh.value = costKwh;
    if(txtVoltage) isNaN(voltage) ? txtVoltage.value = "" : txtVoltage.value = voltage;
    if(txtMult) isNaN(mult) ? txtMult.value = "" : txtMult.value = mult;

    //Update radio buttons.
    if(radWeek && radMonth && radYear) {
        switch(period)
        {
            case Sam.WEEKLY:
                radWeek.checked = true;
            break;
            case Sam.YEARLY:
                radYear.checked = true;
            break;
            default:
                radMonth.checked = true;
            break;
        }
    }

    //Update data in the shaft alignment manager.
    sam.updateKwh(costKwh);
    sam.updateVolts(voltage);
    sam.updateMultiplier(mult);
    sam.updateTime(period);
}

//Create belt alignment manager.
let sam = new Sam
(
    document.getElementById("multi"),
    changeCostData,
    {
        backgroundImg:       bkImg,
        backgroundAlpha:     bkOp,
        movableObjectImg:    "./images/mov.png",
        stationaryObjectImg: "./images/sta.png",
        movableDialImg:      "./images/movable.png",
        stationaryDialImg:   "./images/stationary.png"
    }
);

//Make sure everything resets on a page refresh.
// Removed wizard mode elements - no longer needed
if(document.getElementById("monthly-radio")) {
    document.getElementById("monthly-radio").checked = true;
}
if(document.getElementById("kwh")) document.getElementById("kwh").value = "";
if(document.getElementById("volt")) document.getElementById("volt").value = "";
if(document.getElementById("mult")) document.getElementById("mult").value = "";
if(document.getElementById("report-title")) document.getElementById("report-title").value = "";
if(document.getElementById("report-comments")) document.getElementById("report-comments").value = "";
if(document.getElementById("advanced-use")) document.getElementById("advanced-use").style.display = "none";
sam.clearData();

//Change between basic and advanced mode.
let basicAdvanced = (obj) =>
{
    if(obj.id === "basic")
    {
        if(document.getElementById("advanced-use")) {
            document.getElementById("advanced-use").style.display = "none";
        }
        // Show step content
        document.querySelectorAll('.step-content').forEach(el => el.style.display = 'none');
        if(document.getElementById("step-1")) {
            document.getElementById("step-1").style.display = 'block';
            document.getElementById("step-1").classList.add('active');
        }
        mode = 0;
        setTimeout(() => {
            sDial.resize();
            mDial.resize();
            plot.resize();
            
            // Set current year in footer
            setCurrentYear();
        }, 100);
    }
    else
    {
        if(document.getElementById("advanced-use")) {
            document.getElementById("advanced-use").style.display = "block";
        }
        // Hide step content
        document.querySelectorAll('.step-content').forEach(el => el.style.display = 'none');
        mode = 1;
        sam.redraw();
    }
}

let isNumberKey = (obj, min, max, evt) =>
{
    //Look for special case when enter is hit.
    if(evt.which === 13)
    {
        validateNumber(obj, min, max);
    }

    let charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode != 46 &&(charCode < 48 || charCode > 57)))
    {
        return false;
    }
    return true;
}

let isSignedNumberKey = (obj, min, max, evt) =>
{
    //Look for special case when enter is hit.
    if(evt.which === 13)
    {
        validateNumber(obj, min, max);
    }

    let charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode != 46 &&(charCode < 48 || charCode > 57)))
    {
        if(charCode === 43 || charCode === 45) //+ or -
        {
            return true;
        }
        return false;
    }
    return true;
}

let validateNumber = (obj, min, max) =>
{
    let num = parseFloat(obj.value, 10);    
    
    if(!isNaN(num) && num >= min && num <= max)
    {
        obj.style.backgroundColor = "#ffffff";
        obj.style.borderColor = "#007AFF";

        // Convert to internal units (always inches for dimensions, mils for TIR)
        let internalValue = num;
        if(obj.id.includes('tir')) {
            // TIR values - convert to mils if in micrometers
            if(currentUnits === 'mm') {
                internalValue = convertValue(num, 'micrometers', 'mils');
            }
        } else {
            // Dimension values - convert to inches if in mm
            if(currentUnits === 'mm') {
                internalValue = convertValue(num, 'mm', 'inches');
            }
        }

        switch(obj.id)
        {
            case "dial-dist":
                dialDist = internalValue;
                console.log("dialDist = " + dialDist);
            break;
            case "mff-to-dial":
                mffToDial = internalValue;
                console.log("mffToDial = " + mffToDial);
            break;
            case "mrf-to-dial":
                mrfToDial = internalValue;
                console.log("mrfToDial = " + mrfToDial);
            break;
            case "sff-to-dial":
                sffToDial = internalValue;
                console.log("sffToDial = " + sffToDial);
            break;
            case "srf-to-dial":
                srfToDial = internalValue;
                console.log("srfToDial = " + srfToDial);
            break;
            case "m-tir":
                mTIR = internalValue;
                console.log("mTIR = " + mTIR);
                mDial.setDial(mTIR);
            break;
            case "s-tir":
                sTIR = internalValue;
                console.log("sTIR = " + sTIR);
                sDial.setDial(sTIR);
            break;
            case "kwh":
                sam.updateKwh(num);
            break;
            case "volt":
                sam.updateVolts(num);
            break;
            case "mult":
                sam.updateMultiplier(num);
            break;
            default:
                console.log("Unrecognized ID");
            break;
        }
    }
    else
    {
        obj.value = "";
        obj.style.backgroundColor = "#ffebee";
        obj.style.borderColor = "#FF3B30";

        switch(obj.id)
        {
            case "dial-dist":
                dialDist = undefined;
                console.log("dialDist = " + dialDist);
            break;
            case "mff-to-dial":
                mffToDial = undefined;
                console.log("mffToDial = " + mffToDial);
            break;
            case "mrf-to-dial":
                mrfToDial = undefined;
                console.log("mrfToDial = " + mrfToDial);
            break;
            case "sff-to-dial":
                sffToDial = undefined;
                console.log("sffToDial = " + sffToDial);
            break;
            case "srf-to-dial":
                srfToDial = undefined;
                console.log("srfToDial = " + srfToDial);
            break;
            case "m-tir":
                mTIR = undefined;
                console.log("mTIR = " + mTIR);
                if(document.getElementById("m-tir-1/2")) {
                    document.getElementById("m-tir-1/2").innerHTML = "--";
                }
                if(document.getElementById("m-tir-pm")) {
                    document.getElementById("m-tir-pm").innerHTML = "--";
                }
                mDial.setDial(mTIR);
            break;
            case "s-tir":
                sTIR = undefined;
                console.log("sTIR = " + sTIR);
                if(document.getElementById("s-tir-1/2")) {
                    document.getElementById("s-tir-1/2").innerHTML = "--";
                }
                sDial.setDial(sTIR);
            break;
            case "kwh":
                sam.updateKwh(undefined);
            break;
            case "volt":
                sam.updateVolts(undefined);
            break;
            case "mult":
                sam.updateMultiplier(undefined);
            break;
            default:
                console.log("Unrecognized ID");
            break;
        }
    }

    //Verify all the distances given are valid.
    validDist = true;

    if(mffToDial != undefined && mffToDial <= dialDist)
    {
        document.getElementById("mff-to-dial").style.backgroundColor = "#fff3cd";
        document.getElementById("mff-to-dial").style.borderColor = "#FF9500";
        validDist = false;
    }
    else if(mrfToDial != undefined)
    {
        document.getElementById("mff-to-dial").style.backgroundColor = "#ffffff";
        document.getElementById("mff-to-dial").style.borderColor = "#007AFF";
    }
    
    if(mrfToDial != undefined && (mrfToDial <= mffToDial || mrfToDial <= dialDist))
    {
        document.getElementById("mrf-to-dial").style.backgroundColor = "#fff3cd";
        document.getElementById("mrf-to-dial").style.borderColor = "#FF9500";
        validDist = false;
    }
    else if(mrfToDial != undefined)
    {
        document.getElementById("mrf-to-dial").style.backgroundColor = "#ffffff";
        document.getElementById("mrf-to-dial").style.borderColor = "#007AFF";
    }

    if(srfToDial != undefined && srfToDial <= sffToDial)
    {
        document.getElementById("srf-to-dial").style.backgroundColor = "#fff3cd";
        document.getElementById("srf-to-dial").style.borderColor = "#FF9500";
        validDist = false;
    }
    else if(srfToDial != undefined)
    {
        document.getElementById("srf-to-dial").style.backgroundColor = "#ffffff";
        document.getElementById("srf-to-dial").style.borderColor = "#007AFF";
    }

    //Calculate the total length if the distances are all valid.
    if(validDist && dialDist && mffToDial && mrfToDial && sffToDial && srfToDial)
    {
        totalDist = mrfToDial + srfToDial;
        
        // Display in current units
        let displayValue = totalDist;
        if(currentUnits === 'mm') {
            displayValue = convertValue(totalDist, 'inches', 'mm');
        }
        
        const totalDistElement = document.getElementById("total-dist");
        if(totalDistElement) {
            totalDistElement.innerHTML = displayValue.toFixed(currentUnits === 'inches' ? 2 : 1);
        }
        
        // Enable next button
        const nextBtn = document.getElementById("next-to-measurements");
        if(nextBtn) {
            nextBtn.disabled = false;
            nextBtn.style.opacity = "1";
        }
    }
    else
    {
        totalDist = undefined;
        const totalDistElement = document.getElementById("total-dist");
        if(totalDistElement) {
            totalDistElement.innerHTML = "--";
        }
        
        // Disable next button
        const nextBtn = document.getElementById("next-to-measurements");
        if(nextBtn) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = "0.5";
        }
    }

    //Verify and calculate dial values,
    if(sTIR !== undefined)
    {
        if(document.getElementById("s-tir-1/2")) {
            let displayValue = sTIR / 2;
            if(currentUnits === 'mm') {
                displayValue = convertValue(displayValue, 'mils', 'micrometers');
            }
            document.getElementById("s-tir-1/2").innerHTML = displayValue.toFixed(currentUnits === 'inches' ? 2 : 0);
        }
    }

    if(mTIR !== undefined)
    {
        if(document.getElementById("m-tir-1/2")) {
            let displayValue = mTIR / 2;
            if(currentUnits === 'mm') {
                displayValue = convertValue(displayValue, 'mils', 'micrometers');
            }
            document.getElementById("m-tir-1/2").innerHTML = displayValue.toFixed(currentUnits === 'inches' ? 2 : 0);
        }
        if(document.getElementById("m-tir-pm")) {
            let displayValue = -mTIR / 2;
            if(currentUnits === 'mm') {
                displayValue = convertValue(displayValue, 'mils', 'micrometers');
            }
            document.getElementById("m-tir-pm").innerHTML = displayValue.toFixed(currentUnits === 'inches' ? 2 : 0);
        }
        
        // Enable results button if we have TIR data and basic dimensions
        const hasBasicDimensions = dialDist && mffToDial && mrfToDial && sffToDial && srfToDial;
        if(hasBasicDimensions && sTIR !== undefined && mTIR !== undefined) {
            const resultsBtn = document.getElementById("next-to-results");
            if(resultsBtn) {
                resultsBtn.disabled = false;
                resultsBtn.style.opacity = "1";
            }
        } else {
            const resultsBtn = document.getElementById("next-to-results");
            if(resultsBtn) {
                resultsBtn.disabled = true;
                resultsBtn.style.opacity = "0.5";
            }
        }
    }

    //Pass everything on for calculation.
    let moves = plot.doCalcs(dialDist, mffToDial, mrfToDial, sffToDial, srfToDial, sTIR / 2, -mTIR / 2);

    //If everything passes, display the results.
    if(!isNaN(moves.movable.mi))
    {
        // Use the new updateResultsDisplay function
        updateResultsDisplay(moves);
    }
    else
    {
        const movIn1El = document.getElementById("mov-in1");
        const movOut1El = document.getElementById("mov-out1");
        const staIn1El = document.getElementById("sta-in1");
        const movIn2El = document.getElementById("mov-in2");
        
        if(movIn1El) movIn1El.innerHTML = "--";
        if(movOut1El) movOut1El.innerHTML = "--";
        if(staIn1El) staIn1El.innerHTML = "--";
        if(movIn2El) movIn2El.innerHTML = "--";
    }
    
    // Update navigation state after validation
    updateNavigationState();
    updateSummaryValues();
}

//Clear all inputted data.
let clearData = () =>
{
    //Check for advanced mode. If in advanced mode, let the belt alignment manager handle the data clear.
    if(mode)
    {
        if(document.getElementById("monthly-radio")) document.getElementById("monthly-radio").checked = true;
        if(document.getElementById("kwh")) {
            document.getElementById("kwh").value = "";
            document.getElementById("kwh").style.backgroundColor = "";
            document.getElementById("kwh").style.borderColor = "";
        }
        if(document.getElementById("volt")) {
            document.getElementById("volt").value = "";
            document.getElementById("volt").style.backgroundColor = "";
            document.getElementById("volt").style.borderColor = "";
        }
        if(document.getElementById("mult")) {
            document.getElementById("mult").value = "";
            document.getElementById("mult").style.backgroundColor = "";
            document.getElementById("mult").style.borderColor = "";
        }
        if(document.getElementById("report-title")) document.getElementById("report-title").value = "";
        if(document.getElementById("report-comments")) document.getElementById("report-comments").value = "";
        if(document.getElementById("multi")) document.getElementById("multi").innerHTML = "";
        sam.clearData();
        return;
    }

    // Clear all inputs and reset styles
    const inputs = [
        "dial-dist", "mff-to-dial", "mrf-to-dial", 
        "sff-to-dial", "srf-to-dial", "m-tir", "s-tir"
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if(element) {
            element.value = "";
            element.style.backgroundColor = "#ffffff";
            element.style.borderColor = "#C6C6C8";
        }
    });

    const totalDistElement = document.getElementById("total-dist");
    if(totalDistElement) totalDistElement.innerHTML = "--";
    
    if(document.getElementById("m-tir-1/2")) document.getElementById("m-tir-1/2").innerHTML = "--";
    if(document.getElementById("s-tir-1/2")) document.getElementById("s-tir-1/2").innerHTML = "--";
    if(document.getElementById("m-tir-pm")) document.getElementById("m-tir-pm").innerHTML = "--";
    
    const movIn1El = document.getElementById("mov-in1");
    const movOut1El = document.getElementById("mov-out1");
    const staIn1El = document.getElementById("sta-in1");
    const movIn2El = document.getElementById("mov-in2");
    
    if(movIn1El) movIn1El.innerHTML = "--";
    if(movOut1El) movOut1El.innerHTML = "--";
    if(staIn1El) staIn1El.innerHTML = "--";
    if(movIn2El) movIn2El.innerHTML = "--";

    dialDist  = undefined;
    mffToDial = undefined;
    mrfToDial = undefined;
    sffToDial = undefined;
    srfToDial = undefined;
    totalDist = undefined;
    mTIR      = undefined;
    sTIR      = undefined;
    validDist = false;

    sDial.setDial(sTIR);
    mDial.setDial(mTIR);
    plot.doCalcs(dialDist, mffToDial, mrfToDial, sffToDial, srfToDial, sTIR / 2, -mTIR / 2);
    
    // Reset to step 1 and dimension A only if explicitly clearing
    if(mode === 0) {
        nextStep(1);
        showDimension('A');
    }
    updateNavigationState();
}

//Advanced mode functions. Just pass data to the SAM.
let loadData = (e) => 
{
    let kwh = document.getElementById("kwh");
    let volt = document.getElementById("volt");
    let mult = document.getElementById("mult");
    sam.loadData(e, kwh, volt, mult);
}

let updateTitle    = (obj) => sam.updateTitle(obj.value);
let updateComments = (obj) => sam.updateComments(obj.value);
let addAdjustment  = ()    => sam.addAdjustment();
let addMeasurement = ()    => sam.addMeasurement();
let saveData       = ()    => sam.saveData();
let print          = ()    => sam.print();
let updateTime     = (x)   => sam.updateTime(x);

// Step navigation functions
function nextStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none'; // Explicitly hide all steps
    });
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    
    // Show target step
    const targetStep = document.getElementById(`step-${step}`);
    if(targetStep) {
        targetStep.classList.add('active');
        targetStep.style.display = 'block'; // Explicitly show target step
    }
    
    const progressStep = document.querySelector(`[data-step="${step}"]`);
    if(progressStep) {
        progressStep.classList.add('active');
    }
    
    // Resize components when switching steps
    setTimeout(() => {
        if(step === 2) {
            sDial.resize();
            mDial.resize();
        } else if(step === 3) {
            // Show results and plot sections when going to step 3
            const step3 = document.getElementById('step-3');
            if(step3) {
                const resultsContainer = step3.querySelector('.results-container');
                const plotSection = step3.querySelector('.plot-section');
                
                if(resultsContainer) resultsContainer.style.display = 'block';
                if(plotSection) plotSection.style.display = 'block';
            }
            
            // Resize plot and calculate results when going to results step
            setTimeout(() => {
                plot.resize();
                if(dialDist && mffToDial && mrfToDial && sffToDial && srfToDial && sTIR !== undefined && mTIR !== undefined) {
                    let moves = plot.doCalcs(dialDist, mffToDial, mrfToDial, sffToDial, srfToDial, sTIR / 2, -mTIR / 2);
                    updateResultsDisplay(moves);
                }
            }, 300);
        } else {
            // Hide results and plot sections when not on step 3
            hideAllWizardResults();
        }
    }, 100);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function prevStep(step) {
    nextStep(step);
}

function showOverviewModal() {
    const modal = document.getElementById('overview-modal');
    if(modal) {
        modal.classList.add('active');
    }
}

function closeOverviewModal() {
    const modal = document.getElementById('overview-modal');
    if(modal) {
        modal.classList.remove('active');
    }
}

// Chart.js instance
let alignmentChart = null;

function updateResultsDisplay(moves) {
    if(!moves || isNaN(moves.movable.mi)) {
        return;
    }
    
    const unit = currentUnits === 'inches' ? ' mils' : ' μm';
    
    let movIn1 = moves.movable.mi;
    let movOut1 = moves.movable.mo;
    let staIn1 = moves.inboard.si;
    let movIn2 = moves.inboard.mi;
    
    if(currentUnits === 'mm') {
        movIn1 = convertValue(movIn1, 'mils', 'micrometers');
        movOut1 = convertValue(movOut1, 'mils', 'micrometers');
        staIn1 = convertValue(staIn1, 'mils', 'micrometers');
        movIn2 = convertValue(movIn2, 'mils', 'micrometers');
    }
    
    // Update results display elements if they exist
    const movIn1El = document.getElementById("mov-in1");
    const movOut1El = document.getElementById("mov-out1");
    const staIn1El = document.getElementById("sta-in1");
    const movIn2El = document.getElementById("mov-in2");
    
    if(movIn1El) movIn1El.innerHTML = ((movIn1 >= 0) ? "+" : "") + movIn1.toFixed(currentUnits === 'inches' ? 2 : 0) + unit;
    if(movOut1El) movOut1El.innerHTML = ((movOut1 >= 0) ? "+" : "") + movOut1.toFixed(currentUnits === 'inches' ? 2 : 0) + unit;
    if(staIn1El) staIn1El.innerHTML = ((staIn1 >= 0) ? "+" : "") + staIn1.toFixed(currentUnits === 'inches' ? 2 : 0) + unit;
    if(movIn2El) movIn2El.innerHTML = ((movIn2 >= 0) ? "+" : "") + movIn2.toFixed(currentUnits === 'inches' ? 2 : 0) + unit;
    
    // Update plot status
    const maxMisalignment = Math.max(Math.abs(movIn1), Math.abs(movOut1));
    let status = "Excellent";
    if(maxMisalignment > 2) status = "Good";
    if(maxMisalignment > 5) status = "Fair";
    if(maxMisalignment > 10) status = "Poor";
    
    updatePlotStatus(`Alignment: ${status}`, `Max misalignment: ${maxMisalignment.toFixed(2)}${unit}`);
}

function updatePlotStatus(status, details) {
    const statusEl = document.getElementById("alignment-status");
    const unitsEl = document.getElementById("plot-units");
    
    if(statusEl) {
        statusEl.textContent = status;
        statusEl.className = status.toLowerCase().includes('excellent') ? 'status-excellent' :
                           status.toLowerCase().includes('good') ? 'status-good' :
                           status.toLowerCase().includes('fair') ? 'status-fair' :
                           status.toLowerCase().includes('poor') ? 'status-poor' : '';
    }
    
    if(unitsEl) {
        unitsEl.textContent = currentUnits === 'inches' ? 'Inches & Mils' : 'Millimeters & Micrometers';
    }
}

// Mode switching functionality
function changeMode(radio) {
    const stepContents = document.querySelectorAll('.step-content');
    const singlePageMode = document.getElementById('single-page-mode');
    const progressIndicator = document.querySelector('.progress-indicator');
    
    if(radio.value === 'wizard') {
        // Show wizard mode - but don't set display:block on all steps yet
        singlePageMode.style.display = 'none';
        progressIndicator.style.display = 'flex';
        
        // Reset to step 1 - this will properly show only step 1
        resetToStep1();
    } else {
        // Show single page mode
        stepContents.forEach(step => step.style.display = 'none');
        singlePageMode.style.display = 'block';
        progressIndicator.style.display = 'none'; // Hide progress indicator in single page
        initializeSinglePageMode();
    }
}

function resetToStep1() {
    // Hide all step contents and remove active class
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none'; // Explicitly hide all steps
    });
    
    // Show only step 1
    const step1 = document.getElementById('step-1');
    if(step1) {
        step1.classList.add('active');
        step1.style.display = 'block'; // Explicitly show step 1
    }
    
    // Update progress indicator
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    const progressStep1 = document.querySelector('.step[data-step="1"]');
    if(progressStep1) {
        progressStep1.classList.add('active');
    }
    
    // Hide all results and plot sections
    hideAllWizardResults();
}

function hideAllWizardResults() {
    // Hide results and plot sections in step 3
    const step3 = document.getElementById('step-3');
    if(step3) {
        const resultsContainer = step3.querySelector('.results-container');
        const plotSection = step3.querySelector('.plot-section');
        
        if(resultsContainer) resultsContainer.style.display = 'none';
        if(plotSection) plotSection.style.display = 'none';
    }
}

// Initialize single page mode
function initializeSinglePageMode() {
    // Initialize original Dial class indicators
    if(!window.spSDial) {
        window.spSDial = new Dial(document.getElementById("sp-stationary-dial"), {
            theme: {
                primary: "#F44336",
                secondary: "#D32F2F",
                accent: "#EF5350",
                needle: "#B71C1C"
            }
        });
    }
    if(!window.spMDial) {
        window.spMDial = new Dial(document.getElementById("sp-movable-dial"), {
            theme: {
                primary: "#2196F3",
                secondary: "#1976D2",
                accent: "#64B5F6",
                needle: "#0D47A1"
            }
        });
    }
    
    // Initialize single page plot
    if(!window.spPlot) {
        const spPlotContainer = document.getElementById('sp-plot');
        if(spPlotContainer) {
            window.spPlot = new ShaftPlot(spPlotContainer, {backgroundImg: bkImg, backgroundAlpha: bkOp});
        }
    }
    
    // Resize dials and plot
    setTimeout(() => {
        if(window.spSDial) window.spSDial.resize();
        if(window.spMDial) window.spMDial.resize();
        if(window.spPlot) window.spPlot.resize();
    }, 100);
}

// Update single page TIR calculations
function updateSinglePageTIRCalculations() {
    const sTIRInput = document.getElementById('sp-s-tir').value;
    const mTIRInput = document.getElementById('sp-m-tir').value;
    
    // Use 0 as default if no value, but only show calculations if there's an actual input
    const sTIR = sTIRInput === '' ? 0 : parseFloat(sTIRInput);
    const mTIR = mTIRInput === '' ? 0 : parseFloat(mTIRInput);
    
    // Update calculated values
    const sHalfEl = document.getElementById('sp-s-tir-half');
    const mHalfEl = document.getElementById('sp-m-tir-half');
    const mNegEl = document.getElementById('sp-m-tir-neg');
    
    if(sHalfEl) {
        sHalfEl.textContent = sTIRInput === '' ? '--' : (sTIR / 2).toFixed(2);
    }
    
    if(mHalfEl) {
        mHalfEl.textContent = mTIRInput === '' ? '--' : (mTIR / 2).toFixed(2);
    }
    
    if(mNegEl) {
        mNegEl.textContent = mTIRInput === '' ? '--' : (-mTIR / 2).toFixed(2);
    }
    
    // Update dial indicators - always point to 0 if no value, otherwise show the value
    if(window.spSDial) {
        window.spSDial.setDial(sTIR);
    }
    if(window.spMDial) {
        window.spMDial.setDial(mTIR);
    }
}

// Plot modal functionality
function openPlotModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('plot-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'plot-modal';
        modal.className = 'plot-modal';
        modal.innerHTML = `
            <div class="plot-modal-content">
                <div class="plot-modal-header">
                    <h3>Shaft Alignment Visualization</h3>
                    <button class="plot-modal-close" onclick="closePlotModal()">×</button>
                </div>
                <div class="plot-modal-body">
                    <div class="plot-container-modal" id="modal-plot"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Initialize modal plot
        setTimeout(() => {
            if(!window.modalPlot) {
                const modalPlotContainer = document.getElementById('modal-plot');
                if(modalPlotContainer) {
                    window.modalPlot = new ShaftPlot(modalPlotContainer, {backgroundImg: bkImg, backgroundAlpha: bkOp});
                    
                    // Copy current plot data if available
                    if(window.spPlot && window.spPlot.isValid) {
                        const dimA = parseFloat(document.getElementById('sp-dim-a').value) || undefined;
                        const dimB = parseFloat(document.getElementById('sp-dim-b').value) || undefined;
                        const dimC = parseFloat(document.getElementById('sp-dim-c').value) || undefined;
                        const dimD = parseFloat(document.getElementById('sp-dim-d').value) || undefined;
                        const dimE = parseFloat(document.getElementById('sp-dim-e').value) || undefined;
                        const sTIR = parseFloat(document.getElementById('sp-s-tir').value) || undefined;
                        const mTIR = parseFloat(document.getElementById('sp-m-tir').value) || undefined;
                        
                        if(dimA && dimB && dimC && dimD && dimE && sTIR !== undefined && mTIR !== undefined) {
                            window.modalPlot.doCalcs(dimA, dimB, dimC, dimD, dimE, sTIR / 2, -mTIR / 2);
                        }
                    }
                }
            }
        }, 100);
    }
    
    modal.style.display = 'flex';
}

function closePlotModal() {
    const modal = document.getElementById('plot-modal');
    if(modal) {
        modal.style.display = 'none';
    }
}

// Reset all data function
function resetAllData() {
    // Reset wizard mode inputs
    const wizardInputs = ['dial-dist', 'mff-to-dial', 'mrf-to-dial', 'sff-to-dial', 'srf-to-dial', 's-tir', 'm-tir'];
    wizardInputs.forEach(id => {
        const input = document.getElementById(id);
        if(input) input.value = '';
    });
    
    // Reset single page inputs
    const spInputs = ['sp-dim-a', 'sp-dim-b', 'sp-dim-c', 'sp-dim-d', 'sp-dim-e', 'sp-s-tir', 'sp-m-tir'];
    spInputs.forEach(id => {
        const input = document.getElementById(id);
        if(input) input.value = '';
    });
    
    // Reset calculated values
    const calcElements = ['sp-s-tir-half', 'sp-m-tir-half', 'sp-m-tir-neg'];
    calcElements.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = '--';
    });
    
    // Reset results
    const resultsContainer = document.getElementById('sp-results-container');
    if(resultsContainer) {
        resultsContainer.innerHTML = '<div class="results-placeholder"><p>Enter all dimensions and TIR readings to see results</p></div>';
    }
    
    // Reset dials
    if(window.spSDial) window.spSDial.setDial(0);
    if(window.spMDial) window.spMDial.setDial(0);
    if(sDial) sDial.setDial(0);
    if(mDial) mDial.setDial(0);
    
    // Reset global variables
    dialDist = undefined;
    mffToDial = undefined;
    mrfToDial = undefined;
    sffToDial = undefined;
    srfToDial = undefined;
    sTIR = undefined;
    mTIR = undefined;
    
    // Clear wizard results
    const wizardResults = ['mov-in1', 'mov-out1', 'sta-in1', 'mov-in2'];
    wizardResults.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '--';
    });
    
    // Go back to step 1 if in wizard mode
    const wizardRadio = document.getElementById('wizard');
    if(wizardRadio && wizardRadio.checked) {
        nextStep(1);
    }
}

// Create visual dial indicator
function createDialIndicator(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create dial structure
    const needle = document.createElement('div');
    needle.className = 'dial-needle';
    needle.id = containerId + '-needle';
    
    const numbers = document.createElement('div');
    numbers.className = 'dial-numbers';
    
    // Add numbers and ticks
    for(let i = 0; i <= 100; i += 10) {
        const angle = (i / 100) * 270 - 135; // -135 to +135 degrees
        const radian = (angle * Math.PI) / 180;
        const radius = 45;
        
        // Major tick
        const tick = document.createElement('div');
        tick.className = 'dial-tick major';
        tick.style.position = 'absolute';
        tick.style.left = '50%';
        tick.style.top = '10px';
        tick.style.transformOrigin = '50% 50px';
        tick.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        container.appendChild(tick);
        
        // Number
        if(i % 20 === 0) {
            const number = document.createElement('div');
            number.textContent = i;
            number.style.position = 'absolute';
            number.style.left = `${50 + Math.sin(radian) * 35}%`;
            number.style.top = `${50 - Math.cos(radian) * 35}%`;
            number.style.transform = 'translate(-50%, -50%)';
            number.style.fontSize = '10px';
            number.style.fontWeight = '600';
            number.style.color = '#8B0000';
            numbers.appendChild(number);
        }
    }
    
    container.appendChild(numbers);
    container.appendChild(needle);
}

// Update dial indicator
function updateDialIndicator(containerId, value) {
    const needle = document.getElementById(containerId + '-needle');
    if(!needle) return;
    
    const numValue = parseFloat(value) || 0;
    // Convert value to angle (-135 to +135 degrees for -50 to +50 range)
    const angle = (numValue / 50) * 135;
    needle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
}

// Single page calculations
function updateSinglePageCalculations() {
    const dimA = parseFloat(document.getElementById('sp-dim-a').value) || undefined;
    const dimB = parseFloat(document.getElementById('sp-dim-b').value) || undefined;
    const dimC = parseFloat(document.getElementById('sp-dim-c').value) || undefined;
    const dimD = parseFloat(document.getElementById('sp-dim-d').value) || undefined;
    const dimE = parseFloat(document.getElementById('sp-dim-e').value) || undefined;
    const sTIR = parseFloat(document.getElementById('sp-s-tir').value) || undefined;
    const mTIR = parseFloat(document.getElementById('sp-m-tir').value) || undefined;
    
    // Check if all values are present
    if(dimA && dimB && dimC && dimD && dimE && sTIR !== undefined && mTIR !== undefined) {
        // Perform calculations
        if(window.spPlot) {
            const moves = window.spPlot.doCalcs(dimA, dimB, dimC, dimD, dimE, sTIR / 2, -mTIR / 2);
            displaySinglePageResults(moves);
        }
    } else {
        // Clear results
        const resultsContainer = document.getElementById('sp-results-container');
        if(resultsContainer) {
            resultsContainer.innerHTML = '<div class="results-placeholder"><p>Enter all dimensions and TIR readings to see results</p></div>';
        }
    }
}

// Display single page results
function displaySinglePageResults(plot) {
    const resultsContainer = document.getElementById('sp-results-container');
    if(!resultsContainer || !plot || !plot.movable || isNaN(plot.movable.mi)) return;
    
    const unit = currentUnits === 'inches' ? ' mils' : ' μm';
    
    let movIn1 = plot.movable.mi;
    let movOut1 = plot.movable.mo;
    let staIn1 = plot.inboard.si;
    let movIn2 = plot.inboard.mi;
    
    if(currentUnits === 'mm') {
        movIn1 = convertValue(movIn1, 'mils', 'micrometers');
        movOut1 = convertValue(movOut1, 'mils', 'micrometers');
        staIn1 = convertValue(staIn1, 'mils', 'micrometers');
        movIn2 = convertValue(movIn2, 'mils', 'micrometers');
    }
    
    resultsContainer.innerHTML = `
        <div class="results-container">
            <div class="result-option">
                <div class="option-header">
                    <h3>Option 1: Move Movable Machine</h3>
                    <span class="option-badge recommended">Recommended</span>
                </div>
                <div class="adjustments-grid">
                    <div class="adjustment-item">
                        <img src="./images/mov.png" alt="Movable inboard" class="adjustment-icon">
                        <div class="adjustment-details">
                            <h4>Inboard Feet</h4>
                            <div class="adjustment-value">${((movIn1 >= 0) ? "+" : "") + movIn1.toFixed(currentUnits === 'inches' ? 2 : 0) + unit}</div>
                        </div>
                    </div>
                    <div class="adjustment-item">
                        <img src="./images/mov.png" alt="Movable outboard" class="adjustment-icon">
                        <div class="adjustment-details">
                            <h4>Outboard Feet</h4>
                            <div class="adjustment-value">${((movOut1 >= 0) ? "+" : "") + movOut1.toFixed(currentUnits === 'inches' ? 2 : 0) + unit}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="result-option">
                <div class="option-header">
                    <h3>Option 2: Move Both Machines</h3>
                    <span class="option-badge alternative">Alternative</span>
                </div>
                <div class="adjustments-grid">
                    <div class="adjustment-item">
                        <img src="./images/sta.png" alt="Stationary inboard" class="adjustment-icon">
                        <div class="adjustment-details">
                            <h4>Stationary Inboard</h4>
                            <div class="adjustment-value">${((staIn1 >= 0) ? "+" : "") + staIn1.toFixed(currentUnits === 'inches' ? 2 : 0) + unit}</div>
                        </div>
                    </div>
                    <div class="adjustment-item">
                        <img src="./images/mov.png" alt="Movable inboard" class="adjustment-icon">
                        <div class="adjustment-details">
                            <h4>Movable Inboard</h4>
                            <div class="adjustment-value">${((movIn2 >= 0) ? "+" : "") + movIn2.toFixed(currentUnits === 'inches' ? 2 : 0) + unit}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}



function showDimension(dimension) {
    // Hide all dimension cards
    document.querySelectorAll('.dimension-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Show the selected dimension card
    const targetCard = document.querySelector(`[data-dimension="${dimension}"]`);
    if(targetCard) {
        targetCard.classList.add('active');
    }
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navBtn = document.querySelector(`[data-dim="${dimension}"]`);
    if(navBtn) {
        navBtn.classList.add('active');
    }
    
    // Scroll to the dimension section
    const dimensionsSection = document.querySelector('.dimensions-interactive');
    if(dimensionsSection) {
        dimensionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextDimension(dimension) {
    showDimension(dimension);
    updateNavigationState();
}

function prevDimension(dimension) {
    showDimension(dimension);
    updateNavigationState();
}

function showSummary() {
    showDimension('summary');
    updateSummaryValues();
    updateNavigationState();
}

function updateNavigationState() {
    // Update navigation button states based on completed dimensions
    const dimensions = ['A', 'B', 'C', 'D', 'E'];
    const values = [dialDist, mffToDial, mrfToDial, sffToDial, srfToDial];
    
    dimensions.forEach((dim, index) => {
        const navBtn = document.querySelector(`[data-dim="${dim}"]`);
        const nextBtn = document.getElementById(`next-${dim.toLowerCase()}`);
        
        if(navBtn) {
            if(values[index] !== undefined) {
                navBtn.classList.add('completed');
            } else {
                navBtn.classList.remove('completed');
            }
        }
        
        if(nextBtn) {
            nextBtn.disabled = values[index] === undefined;
        }
    });
    
    // Update summary button
    const summaryBtn = document.querySelector('[data-dim="summary"]');
    if(summaryBtn) {
        const allCompleted = values.every(val => val !== undefined);
        if(allCompleted) {
            summaryBtn.classList.add('completed');
        } else {
            summaryBtn.classList.remove('completed');
        }
    }
}

function updateSummaryValues() {
    const unit = currentUnits;
    
    // Update summary display values
    const summaryElements = {
        'summary-a': dialDist,
        'summary-b': mffToDial,
        'summary-c': mrfToDial,
        'summary-d': sffToDial,
        'summary-e': srfToDial
    };
    
    Object.entries(summaryElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if(element) {
            if(value !== undefined) {
                let displayValue = value;
                if(currentUnits === 'mm') {
                    displayValue = convertValue(value, 'inches', 'mm');
                }
                element.textContent = displayValue.toFixed(currentUnits === 'inches' ? 2 : 1) + ' ' + unit;
            } else {
                element.textContent = '--';
            }
        }
    });
    
    // Update total (F = C + E)
    const totalElement = document.getElementById('summary-f');
    if(totalElement) {
        if(mrfToDial !== undefined && srfToDial !== undefined) {
            let totalLength = mrfToDial + srfToDial;
            let displayValue = totalLength;
            if(currentUnits === 'mm') {
                displayValue = convertValue(totalLength, 'inches', 'mm');
            }
            totalElement.textContent = displayValue.toFixed(currentUnits === 'inches' ? 2 : 1) + ' ' + unit;
        } else {
            totalElement.textContent = '--';
        }
    }
}

function toggleHelp() {
    const modal = document.getElementById('help-modal');
    if(modal) {
        modal.classList.toggle('active');
    }
}

// Initialize the application
updateUnitsDisplay();
clearData();

// Disable next buttons initially
const nextToMeasurements = document.getElementById("next-to-measurements");
if(nextToMeasurements) {
    nextToMeasurements.disabled = true;
    nextToMeasurements.style.opacity = "0.5";
}

const nextToResults = document.getElementById("next-to-results");
if(nextToResults) {
    nextToResults.disabled = true;
    nextToResults.style.opacity = "0.5";
}

// Set current year in footer
function setCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if(yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}
