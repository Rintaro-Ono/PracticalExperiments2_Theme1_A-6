const appState = {
  currentUser: null,
  users: [
    { userId: 's001', name: '田中 太郎' },
    { userId: 's002', name: '山田 花子' },
    { userId: 's003', name: '佐藤 次郎' },
  ],
  events: [
    {
      id: 'event_1',
      name: '新歓費',
      amount: 500,
      date: '2026-11-10',
      participants: [
        { userId: 's001', name: '田中 太郎', status: '承認済み' },
        { userId: 's002', name: '山田 花子', status: '未入金' },
        { userId: 's003', name: '佐藤 次郎', status: '承認待ち' },
      ],
    },
    {
      id: 'event_2',
      name: '合宿代',
      amount: 1200,
      date: '2026-11-20',
      participants: [
        { userId: 's001', name: '田中 太郎', status: '未入金' },
        { userId: 's002', name: '山田 花子', status: '承認済み' },
        { userId: 's003', name: '佐藤 次郎', status: '未入金' },
      ],
    },
  ],
  selectedEventId: null,
  editingEventId: null,
  changingParticipantId: null,
};

const STATUS_LABELS = {
  未入金: '未入金',
  承認待ち: '承認待ち',
  承認済み: '承認済み',
};

function createId(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}_${Date.now()}`;
}

function getUserById(userId) {
  return appState.users.find((user) => user.userId === userId) || null;
}

function getEventById(eventId) {
  return appState.events.find((event) => event.id === eventId) || null;
}

function getSelectedEvent() {
  return getEventById(appState.selectedEventId);
}

function buildParticipantRecord(userId) {
  const user = getUserById(userId);
  if (!user) return null;

  return {
    userId: user.userId,
    name: user.name,
    status: '未入金',
  };
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
}

function clearModalInputs(modalId) {
  const form = document.getElementById(modalId)?.querySelector('form');
  if (!form) return;
  form.reset();
}

function renderEventList() {
  const eventList = document.getElementById('event-list');
  eventList.innerHTML = '';

  appState.events.forEach((event) => {
    const item = document.createElement('li');
    if (event.id === appState.selectedEventId) {
      item.classList.add('active');
    }

    item.dataset.eventId = event.id;
    item.innerHTML = `
      <span class="event-name">${event.name}</span>
      <span class="event-amount">¥${Number(event.amount).toLocaleString()}</span>
    `;

    item.addEventListener('click', () => {
      appState.selectedEventId = event.id;
      renderAll();
    });

    eventList.appendChild(item);
  });
}

function renderEventDetail() {
  const event = getSelectedEvent();
  const detailPanel = document.getElementById('event-detail-panel');
  const participantPanel = document.getElementById('participant-panel');

  if (!event) {
    detailPanel.hidden = true;
    participantPanel.hidden = true;
    return;
  }

  detailPanel.hidden = false;
  participantPanel.hidden = false;

  document.getElementById('detail-event-name').textContent = event.name;
  document.getElementById('detail-event-amount').textContent = `¥${Number(event.amount).toLocaleString()}`;
  document.getElementById('detail-event-date').textContent = event.date;

  const detailParticipants = document.getElementById('detail-participant-list');
  detailParticipants.innerHTML = '';
  event.participants.forEach((participant) => {
    const li = document.createElement('li');
    li.textContent = participant.name;
    detailParticipants.appendChild(li);
  });

  const tbody = document.getElementById('participant-table-body');
  tbody.innerHTML = '';

  event.participants.forEach((participant) => {
    const row = document.createElement('tr');
    row.dataset.userId = participant.userId;
    row.innerHTML = `
      <td>${participant.name}</td>
      <td>${STATUS_LABELS[participant.status] || participant.status}</td>
    `;

    row.addEventListener('click', () => {
      appState.changingParticipantId = participant.userId;
      const statusSelect = document.getElementById('status-select');
      statusSelect.value = participant.status;
      showModal('status-modal');
    });

    tbody.appendChild(row);
  });
}

function renderParticipantCheckboxList() {
  const list = document.getElementById('participant-checkbox-list');
  list.innerHTML = '';

  appState.users.forEach((user) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <label>
        <input type="checkbox" value="${user.userId}" />
        <span>${user.name}</span>
      </label>
    `;
    list.appendChild(item);
  });
}

function renderLoginState() {
  const loginPanel = document.querySelector('.login-panel');
  const eventPanel = document.getElementById('event-panel');
  const eventDetailPanel = document.getElementById('event-detail-panel');

  if (appState.currentUser) {
    loginPanel.hidden = true;
    eventPanel.hidden = false;
    if (appState.selectedEventId) {
      eventDetailPanel.hidden = false;
    }
  } else {
    loginPanel.hidden = false;
    eventPanel.hidden = true;
    eventDetailPanel.hidden = true;
  }
}

function renderAll() {
  renderLoginState();
  renderEventList();
  renderEventDetail();
  renderParticipantCheckboxList();
}

function handleLoginSubmit(event) {
  event.preventDefault();

  const userIdInput = document.getElementById('user-id');
  const userNameInput = document.getElementById('user-name');

  const userId = userIdInput.value.trim();
  const userName = userNameInput.value.trim();

  if (!userId || !userName) {
    alert('ユーザーIDと名前を入力してください');
    return;
  }

  let user = appState.users.find((item) => item.userId === userId);

  if (!user) {
    user = { userId, name: userName };
    appState.users.push(user);
  } else {
    user.name = userName;
  }

  appState.currentUser = user;
  appState.selectedEventId = appState.events[0]?.id || null;
  renderAll();

  userIdInput.value = '';
  userNameInput.value = '';
}

function handleAddEventSubmit(event) {
  event.preventDefault();

  const eventName = document.getElementById('event-name').value.trim();
  const eventAmount = Number(document.getElementById('event-amount').value);
  const eventDate = document.getElementById('event-date').value;

  if (!eventName || !eventDate || Number.isNaN(eventAmount) || eventAmount <= 0) {
    alert('イベント名・金額・日付を正しく入力してください');
    return;
  }

  const checkedBoxes = document.querySelectorAll('#participant-checkbox-list input:checked');
  const selectedUserIds = Array.from(checkedBoxes).map((checkbox) => checkbox.value);

  const participantRecords =
    selectedUserIds.length > 0
      ? selectedUserIds
          .map((userId) => buildParticipantRecord(userId))
          .filter(Boolean)
      : appState.users.map((user) => ({
          userId: user.userId,
          name: user.name,
          status: '未入金',
        }));

  const newEvent = {
    id: createId('event'),
    name: eventName,
    amount: eventAmount,
    date: eventDate,
    participants: participantRecords,
  };

  appState.events.push(newEvent);
  appState.selectedEventId = newEvent.id;
  closeModal('add-event-modal');
  clearModalInputs('add-event-modal');
  renderAll();
}

function handleEditEventSubmit(event) {
  event.preventDefault();

  const selectedEvent = getSelectedEvent();
  if (!selectedEvent) return;

  const name = document.getElementById('edit-event-name').value.trim();
  const amount = Number(document.getElementById('edit-event-amount').value);
  const date = document.getElementById('edit-event-date').value;

  if (!name || !date || Number.isNaN(amount) || amount <= 0) {
    alert('イベント名・金額・日付を正しく入力してください');
    return;
  }

  selectedEvent.name = name;
  selectedEvent.amount = amount;
  selectedEvent.date = date;

  closeModal('edit-event-modal');
  renderAll();
}

function handleDeleteEvent() {
  const selectedEvent = getSelectedEvent();
  if (!selectedEvent) return;

  appState.events = appState.events.filter((event) => event.id !== selectedEvent.id);
  appState.selectedEventId = appState.events[0]?.id || null;
  closeModal('delete-event-modal');
  renderAll();
}

function handleStatusFormSubmit(event) {
  event.preventDefault();

  const selectedEvent = getSelectedEvent();
  if (!selectedEvent || !appState.changingParticipantId) return;

  const nextStatus = document.getElementById('status-select').value;
  const participant = selectedEvent.participants.find(
    (item) => item.userId === appState.changingParticipantId
  );

  if (!participant) return;

  participant.status = nextStatus;
  appState.changingParticipantId = null;

  closeModal('status-modal');
  renderAll();
}

function openAddEventModal() {
  renderParticipantCheckboxList();
  showModal('add-event-modal');
}

function openEditEventModal() {
  const event = getSelectedEvent();
  if (!event) return;

  document.getElementById('edit-event-name').value = event.name;
  document.getElementById('edit-event-amount').value = event.amount;
  document.getElementById('edit-event-date').value = event.date;
  showModal('edit-event-modal');
}

function openDeleteEventModal() {
  const event = getSelectedEvent();
  if (!event) return;
  showModal('delete-event-modal');
}

function bindGlobalEvents() {
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);

  document.querySelector('.add-event-button').addEventListener('click', openAddEventModal);
  document.getElementById('add-event-form').addEventListener('submit', handleAddEventSubmit);

  document.querySelector('.edit-event-button').addEventListener('click', openEditEventModal);
  document.getElementById('edit-event-form').addEventListener('submit', handleEditEventSubmit);

  document.querySelector('.delete-event-button').addEventListener('click', openDeleteEventModal);
  document.querySelector('.confirm-delete-button').addEventListener('click', handleDeleteEvent);

  document.getElementById('status-form').addEventListener('submit', handleStatusFormSubmit);

  document.querySelectorAll('.modal-close, .modal-cancel').forEach((element) => {
    element.addEventListener('click', () => {
      const modal = element.closest('.modal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
}

function init() {
  bindGlobalEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);

if (typeof window !== 'undefined') {
  window.accountingApp = {
    appState,
    getSelectedEvent,
    getEventById,
    renderAll,
  };
}
