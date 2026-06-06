document.addEventListener('DOMContentLoaded', () => {
  // Set default transaction date input to today
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }

  // Load custom user accounts options
  loadAccountOptions();

  // 1. Submit Expense Form
  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitTransaction('expense');
    });
  }

  // 2. Submit Income Form
  const incomeForm = document.getElementById('income-form');
  if (incomeForm) {
    incomeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitTransaction('income');
    });
  }

  // 3. Voice Entry Web Speech integration
  const voiceBtn = document.getElementById('voice-entry-btn');
  if (voiceBtn) {
    initVoiceEntry(voiceBtn);
  }

  // 4. OCR Bill Scanner Drag-and-Drop integration
  const dropzone = document.getElementById('ocr-dropzone');
  const fileInput = document.getElementById('ocr-file-input');
  if (dropzone && fileInput) {
    initOcrScanner(dropzone, fileInput);
  }
});

// Fetch user profile to read list of multi-accounts and build options dynamically
async function loadAccountOptions() {
  const accountSelect = document.getElementById('account');
  if (!accountSelect) return;

  try {
    const res = await apiFetch('/profile');
    if (res.success && res.data.accounts) {
      accountSelect.innerHTML = '';
      res.data.accounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc;
        option.textContent = acc;
        accountSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Error loading account options list:', err);
  }
}

// Global submit transaction handler
async function submitTransaction(type) {
  const title = document.getElementById('title').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value;
  const account = document.getElementById('account').value;
  const notes = document.getElementById('notes').value.trim();

  if (!title || isNaN(amount) || !date || !category) {
    showToast('Please fill out all required fields.', 'warning');
    return;
  }

  try {
    const res = await apiFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        title,
        amount,
        type,
        category,
        date,
        account,
        notes
      })
    });

    if (res.success) {
      showToast(`${type === 'expense' ? 'Expense' : 'Income'} recorded successfully!`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      showToast(res.message || 'Record request failed', 'danger');
    }
  } catch (error) {
    showToast('Connection failed. Server is offline.', 'danger');
  }
}

// ----------------------------------------------------
// Web Speech API Voice Transcription Handler
// ----------------------------------------------------
function initVoiceEntry(btn) {
  // Check browser SpeechRecognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    btn.style.display = 'none'; // Hide if speech synthesis is not supported
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  btn.addEventListener('click', () => {
    if (btn.classList.contains('listening')) {
      recognition.stop();
      return;
    }

    btn.classList.add('listening');
    showToast('Listening... Speak naturally e.g. "Spent 30 dollars on groceries for dinner"', 'info');

    recognition.start();
  });

  recognition.onresult = async (event) => {
    btn.classList.remove('listening');
    const speechResult = event.results[0][0].transcript;
    showToast(`Transcribed: "${speechResult}"`, 'success');

    // Send phrase transcription text to backend AI/Heuristics NLP router
    try {
      const res = await apiFetch('/transactions/voice', {
        method: 'POST',
        body: JSON.stringify({ text: speechResult })
      });

      if (res.success && res.data) {
        const parsed = res.data;
        // Autofill inputs
        if (parsed.title) document.getElementById('title').value = parsed.title;
        if (parsed.amount) document.getElementById('amount').value = parsed.amount;
        if (parsed.date) document.getElementById('date').value = parsed.date;
        if (parsed.category) {
          const select = document.getElementById('category');
          // Match option
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value.toLowerCase() === parsed.category.toLowerCase()) {
              select.selectedIndex = i;
              break;
            }
          }
        }
        showToast('Extracted details filled successfully!', 'success');
      }
    } catch (err) {
      showToast('Heuristic voice parsing server failed', 'danger');
    }
  };

  recognition.onspeechend = () => {
    btn.classList.remove('listening');
    recognition.stop();
  };

  recognition.onerror = (event) => {
    btn.classList.remove('listening');
    console.error('Speech recognition error:', event.error);
    showToast(`Voice input failed: ${event.error}`, 'danger');
  };
}

// ----------------------------------------------------
// OCR Bill File Scanner & Drag-Drop Handler
// ----------------------------------------------------
let extractedOcrData = null; // Store scanning response temporarily

function initOcrScanner(dropzone, input) {
  // Click dropzone to open browser choose dialog
  dropzone.addEventListener('click', () => {
    input.click();
  });

  // Drag over animations
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processOcrFile(e.dataTransfer.files[0]);
    }
  });

  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      processOcrFile(input.files[0]);
    }
  });

  // Apply OCR values trigger
  const applyBtn = document.getElementById('ocr-apply-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      if (extractedOcrData) {
        if (extractedOcrData.title) document.getElementById('title').value = extractedOcrData.title;
        if (extractedOcrData.amount) document.getElementById('amount').value = extractedOcrData.amount;
        if (extractedOcrData.date) document.getElementById('date').value = extractedOcrData.date;
        if (extractedOcrData.notes) document.getElementById('notes').value = extractedOcrData.notes;
        if (extractedOcrData.category) {
          const select = document.getElementById('category');
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value.toLowerCase() === extractedOcrData.category.toLowerCase()) {
              select.selectedIndex = i;
              break;
            }
          }
        }
        showToast('OCR scanned attributes copied to main form!', 'success');
        document.getElementById('ocr-preview').style.display = 'none';
        extractedOcrData = null;
      }
    });
  }
}

async function processOcrFile(file) {
  const laser = document.getElementById('ocr-laser');
  const titleLbl = document.getElementById('ocr-status-title');
  const preview = document.getElementById('ocr-preview');
  const resultText = document.getElementById('ocr-result-text');

  // Trigger scanning overlay visual effects
  laser.style.display = 'block';
  titleLbl.innerText = 'Scanning receipt text...';
  preview.style.display = 'none';

  // Prepare FormData
  const formData = new FormData();
  formData.append('receipt', file);

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_URL}/transactions/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const res = await response.json();
    
    // Stop scanner animation
    laser.style.display = 'none';
    titleLbl.innerText = 'Drag & Drop Receipt';

    if (res.success && res.data) {
      extractedOcrData = res.data;
      preview.style.display = 'block';
      resultText.innerHTML = `
        <strong>Merchant:</strong> ${res.data.title}<br>
        <strong>Amount:</strong> $${res.data.amount.toFixed(2)}<br>
        <strong>Category:</strong> ${res.data.category}<br>
        <strong>Date:</strong> ${res.data.date}
      `;
      showToast('Receipt scan compiled successfully!', 'success');
    } else {
      showToast(res.message || 'Scanning process failed', 'danger');
    }
  } catch (error) {
    laser.style.display = 'none';
    titleLbl.innerText = 'Drag & Drop Receipt';
    showToast('OCR upload request failed. Server offline.', 'danger');
  }
}
