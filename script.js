const state = {
    currentDate: new Date(),
    periodDates: {},
    displayMonth: new Date()
};

const STORAGE_KEY = 'periodTrackerData';

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        state.periodDates = JSON.parse(saved); // if saved data exists, parse and load it
    }
}

// save user-added period dates to local storage
function saveData() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.periodDates));
}

// helper to create a unique key for each date
function getDateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function togglePeriodDay(date) {
    const key = getDateKey(date); // generate key for the date
    if (state.periodDates[key]) { // if date is already logged, remove it (double click to delete)
        delete state.periodDates[key];
    } else {
        state.periodDates[key] = true; // otherwise, add the date as a period day
    }

    // updates after toggling (these funcs are defined later)
    saveData();
    renderCalendar();
    updateStats();
    renderHistory();
}

// turns dates into cycles :0
function getPeriodCycles() {
    // convert logged dates to Date objects and sort them
    const dates = Object.keys(state.periodDates).map(key => {
        const [year, month, day] = key.split('-').map(Number);
        return new Date(year, month, day);
    }).sort((a, b) => a - b);

    if (dates.length === 0) return [];

    const cycles = []; // will hold all detected cycles
    let currentCycle = [dates[0]]; // start with the first date to initialize the cycle

    for (let i = 1; i < dates.length; i++) {
        const dayDiff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        
        if (dayDiff <= 1) {
            currentCycle.push(dates[i]); // .push() is adding an item to the end of an array
        } else {
            cycles.push(currentCycle);
            currentCycle = [dates[i]];
        }
    }
    cycles.push(currentCycle);

    // .map() transforms each item in an array into something else and returns a new array
    // here, we transform cycles into objects with startDate, endDate, and length
    return cycles.map(cycle => ({
        startDate: cycle[0],
        endDate: cycle[cycle.length - 1],
        length: cycle.length
    }));
}

function calculateAverageCycleLength() {
    const cycles = getPeriodCycles();
    if (cycles.length < 2) return null;

    // calculate days between the start of each cycle
    let totalDays = 0;
    for (let i = 1; i < cycles.length; i++) {
        const daysBetween = (cycles[i].startDate - cycles[i - 1].startDate) / (1000 * 60 * 60 * 24);
        totalDays += daysBetween;
    }

    return Math.round(totalDays / (cycles.length - 1));
}

function getPredictions() {
    const cycles = getPeriodCycles();
    if (cycles.length === 0) return null;

    const avgCycleLength = calculateAverageCycleLength() || 28; // || is the OR operator. this defaults to 28 if not enough data.
    const lastCycle = cycles[cycles.length - 1];
    const lastPeriodStart = lastCycle.startDate;

    // making the predictions
    const nextPeriodDate = new Date(lastPeriodStart);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + avgCycleLength);

    const ovulationDate = new Date(lastPeriodStart);
    ovulationDate.setDate(ovulationDate.getDate() + Math.floor(avgCycleLength / 2));

    return {
        nextPeriod: nextPeriodDate,
        ovulation: ovulationDate,
        cycleLength: avgCycleLength
    };
}

// overview part of months with logged periods
function getMonthsWithPeriods() {
    const dates = Object.keys(state.periodDates).map(key => {
        const [year, month, day] = key.split('-').map(Number);
        return new Date(year, month, day);
    });

    if (dates.length === 0) return [];

    const monthsSet = new Set();
    dates.forEach(date => {
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        monthsSet.add(monthKey);
    });

    return Array.from(monthsSet).map(key => {
        const [year, month] = key.split('-').map(Number);
        return new Date(year, month, 1);
    }).sort((a, b) => b - a);
}

function renderHistory() {
    const historyDiv = document.getElementById('historyMonths');
    const monthsWithPeriods = getMonthsWithPeriods();

    if (monthsWithPeriods.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">No period data logged yet</p>';
        return;
    }

    let html = ''; // Start with empty string

    // Add HTML for each month
    monthsWithPeriods.forEach(monthDate => {
        html += `<div class="history-month">${renderHistoryMonth(monthDate)}</div>`;
    });

    historyDiv.innerHTML = html; // Put all the HTML into the page
}

// renders a single month in the history view
function renderHistoryMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    // These lines figure out the calendar layout information needed to draw the month correctly :0
    const firstDayWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate(); // To fill empty spaces at the beginning with previous month's dates :0 !!!

    let html = `<div class="history-month-title">${monthName}</div>`; // makes HTML add a new div for the title of each month
    html += '<div class="history-calendar">';
    
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayHeaders.forEach(day => {
        html += `<div class="history-day-header">${day}</div>`;
    });

    // Fill in the days from the previous month
    for (let i = firstDayWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevLastDate - i);
        html += createHistoryDayElement(date, 'other-month');
    }

    // Fill in the days of the current month
    for (let i = 1; i <= lastDate; i++) {
        const date = new Date(year, month, i);
        html += createHistoryDayElement(date);
    }

    // Fill in the days from the next month
    const remainingDays = 42 - (firstDayWeek + lastDate); // 42 is the number of squares in a standard calendar grid
    for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        html += createHistoryDayElement(date, 'other-month');
    }

    html += '</div>';
    return html;
}

// here extraClass is ether thebprev or next month class
function createHistoryDayElement(date, extraClass = '') {
    const key = getDateKey(date);
    const isPeriod = state.periodDates[key];
    
    let classes = 'history-day';
    if (extraClass) classes += ` ${extraClass}`;
    if (isPeriod) classes += ' period';

    return `<div class="${classes}">${date.getDate()}</div>`;
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const monthDisplay = document.getElementById('currentMonth');
    
    const year = state.displayMonth.getFullYear();
    const month = state.displayMonth.getMonth();
    
    monthDisplay.textContent = state.displayMonth.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    let html = '';
    
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        html += `<div class="day-header">${day}</div>`;
    });

    const predictions = getPredictions();
    let predictedDates = {};
    
    if (predictions) {
        const nextPeriodKey = getDateKey(predictions.nextPeriod);
        const ovulationKey = getDateKey(predictions.ovulation);
        predictedDates[nextPeriodKey] = 'predicted-period';
        predictedDates[ovulationKey] = 'predicted-ovulation';
    }

    for (let i = firstDayWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevLastDate - i);
        html += createDayElement(date, 'other-month', predictedDates);
    }

    for (let i = 1; i <= lastDate; i++) {
        const date = new Date(year, month, i);
        html += createDayElement(date, '', predictedDates);
    }

    const remainingDays = 42 - (firstDayWeek + lastDate);
    for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        html += createDayElement(date, 'other-month', predictedDates);
    }

    calendar.innerHTML = html;
}

// Creates HTML for one calendar day square with the right styling.
function createDayElement(date, extraClass = '', predictedDates = {}) {
    const key = getDateKey(date);
    const isToday = date.toDateString() === state.currentDate.toDateString();
    // these will return True or False
    const isPeriod = state.periodDates[key];
    const prediction = predictedDates[key];
    
    // The if () syntax checks if something is true, then runs the code inside.
    // The JavaScript picks which classes to use for each date based on the date's status
    let classes = 'day';
    if (extraClass) classes += ` ${extraClass}`;
    if (isToday) classes += ' today';
    if (isPeriod) classes += ' period';
    if (prediction && !isPeriod) classes += ` ${prediction}`;

    return `<div class="${classes}" data-date="${date.toISOString()}">${date.getDate()}</div>`;
}

function updateStats() {
    const statsText = document.getElementById('statsText');
    const cycleInfo = document.getElementById('cycleInfo');
    const predictionDiv = document.getElementById('predictions');
    
    const dates = Object.keys(state.periodDates).map(key => {
        const [year, month, day] = key.split('-').map(Number);
        return new Date(year, month, day);
    }).sort((a, b) => b - a);

    if (dates.length === 0) {
        statsText.textContent = 'Click dates to start tracking';
        cycleInfo.textContent = '';
        //predictionDiv.innerHTML = '<p>Track at least 2 cycles to see predictions</p>';
        return;
    }

    const lastPeriod = dates[0];
    const daysSince = Math.floor((state.currentDate - lastPeriod) / (1000 * 60 * 60 * 24));
    
    statsText.textContent = `Last period: ${lastPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    cycleInfo.textContent = `${daysSince} days ago`;

    const predictions = getPredictions();
    if (predictions) {
        const nextPeriodDays = Math.floor((predictions.nextPeriod - state.currentDate) / (1000 * 60 * 60 * 24));
        const ovulationDays = Math.floor((predictions.ovulation - state.currentDate) / (1000 * 60 * 60 * 24));
        
        let predictionHTML = '<div class="prediction-title">Predictions</div>';
        
        predictionHTML += '<div class="prediction-item">';
        predictionHTML += '<span class="prediction-label">Next Period:</span> ';
        predictionHTML += `<span class="prediction-date">${predictions.nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
        predictionHTML += ` <span class="prediction-days">(in ${nextPeriodDays} days)</span>`;
        predictionHTML += '</div>';
        
        predictionHTML += '<div class="prediction-item">';
        predictionHTML += '<span class="prediction-label">Ovulation:</span> ';
        predictionHTML += `<span class="prediction-date">${predictions.ovulation.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
        if (ovulationDays >= 0) {
            predictionHTML += ` <span class="prediction-days">(in ${ovulationDays} days)</span>`;
        } else {
            predictionHTML += ` <span class="prediction-days">(${Math.abs(ovulationDays)} days ago)</span>`;
        }
        predictionHTML += '</div>';
        
        predictionHTML += `<div class="prediction-note">Based on ${predictions.cycleLength}-day average cycle</div>`;
        
        predictionDiv.innerHTML = predictionHTML;
    } else {
        predictionDiv.innerHTML = '<p>Start Tracking !!</p>';
    }
}

document.getElementById('prevMonth').addEventListener('click', () => {
    state.displayMonth.setMonth(state.displayMonth.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    state.displayMonth.setMonth(state.displayMonth.getMonth() + 1);
    renderCalendar();
});

document.getElementById('calendar').addEventListener('click', (e) => {
    if (e.target.classList.contains('day')) {
        const date = new Date(e.target.dataset.date);
        togglePeriodDay(date);
    }
});

loadData();
renderCalendar();
updateStats();
renderHistory();