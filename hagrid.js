const STORAGE_KEY = 'habitsTrackerData';

// Set default date to today
document.getElementById('dateInput').valueAsDate = new Date();

// Update slider values in real-time
['happiness', 'sleep', 'exercise', 'breathing'].forEach(habit => {
    const slider = document.getElementById(habit);
    const valueDisplay = document.getElementById(`${habit}Value`);
    
    slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
    });
});

// Load existing data for selected date
document.getElementById('dateInput').addEventListener('change', loadExistingData);

function loadExistingData() {
    const dateInput = document.getElementById('dateInput').value;
    if (!dateInput) return;
    
    const data = loadAllData();
    const existingEntry = data[dateInput];
    
    if (existingEntry) {
        ['happiness', 'sleep', 'exercise', 'breathing'].forEach(habit => {
            const slider = document.getElementById(habit);
            const valueDisplay = document.getElementById(`${habit}Value`);
            slider.value = existingEntry[habit] || 5;
            valueDisplay.textContent = existingEntry[habit] || 5;
        });
    } else {
        // Reset to defaults
        ['happiness', 'sleep', 'exercise', 'breathing'].forEach(habit => {
            const slider = document.getElementById(habit);
            const valueDisplay = document.getElementById(`${habit}Value`);
            slider.value = 5;
            valueDisplay.textContent = 5;
        });
    }
}

// Handle form submission
document.getElementById('habitsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const dateInput = document.getElementById('dateInput').value;
    if (!dateInput) {
        alert('Please select a date');
        return;
    }
    
    const entry = {
        happiness: parseInt(document.getElementById('happiness').value),
        sleep: parseInt(document.getElementById('sleep').value),
        exercise: parseInt(document.getElementById('exercise').value),
        breathing: parseInt(document.getElementById('breathing').value)
    };
    
    saveEntry(dateInput, entry);
    showSuccessMessage();
    renderHistory();
});

function loadAllData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
}

function saveEntry(date, entry) {
    const data = loadAllData();
    data[date] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showSuccessMessage() {
    const message = document.getElementById('successMessage');
    message.style.display = 'block';
    setTimeout(() => {
        message.style.display = 'none';
    }, 3000);
}

function renderHistory() {
    const historyDiv = document.getElementById('historyEntries');
    const data = loadAllData();
    
    const entries = Object.keys(data)
        .sort()
        .reverse()
        .slice(0, 10);
    
    if (entries.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">No entries yet</p>';
        return;
    }
    
    let html = '';
    entries.forEach(date => {
        const entry = data[date];
        const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        html += `
            <div class="history-entry">
                <div class="history-date">${formattedDate}</div>
                <div class="history-scores">
                    <div class="history-score">
                        <span class="score-label">Happiness:</span>
                        <span class="score-value">${entry.happiness}/10</span>
                    </div>
                    <div class="history-score">
                        <span class="score-label">Sleep:</span>
                        <span class="score-value">${entry.sleep}/10</span>
                    </div>
                    <div class="history-score">
                        <span class="score-label">Exercise:</span>
                        <span class="score-value">${entry.exercise}/10</span>
                    </div>
                    <div class="history-score">
                        <span class="score-label">Breathing:</span>
                        <span class="score-value">${entry.breathing}/10</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    historyDiv.innerHTML = html;
}

// Load initial data
loadExistingData();
renderHistory();