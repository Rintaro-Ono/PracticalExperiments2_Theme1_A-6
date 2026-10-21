document.addEventListener('DOMContentLoaded', () => {
  console.log('聖徳太子会計');

  const eventForm = document.getElementById('event-form');
  const memberForm = document.getElementById('member-form');
  const eventTitleInput = document.getElementById('event-title');
  const eventAmountInput = document.getElementById('event-amount');
  const eventHostSelect = document.getElementById('event-host');
  const paymentList = document.getElementById('payment-list');
  const memberNameInput = document.getElementById('member-name');

  const members = [
    { member_id: 1, name: '山田', role: '幹事' },
    { member_id: 2, name: '鈴木', role: 'メンバー' },
    { member_id: 3, name: '佐藤', role: 'メンバー' },
  ];

  const events = [];

  const statusLabels = {
    unpaid: '未払い',
    pending: '確認中',
    approved: '支払い済み',
  };

  function renderHostOptions() {
    eventHostSelect.innerHTML = members
      .map(
        (member) =>
          `<option value="${member.member_id}">${member.name}</option>`
      )
      .join('');
  }

  function renderPaymentList() {
    paymentList.innerHTML = members
      .map((member) => {
        const latestEvent = events[events.length - 1];
        const paymentStatus = latestEvent?.payments?.[member.member_id] || 'unpaid';

        return `
          <tr>
            <td>${member.name}</td>
            <td>${member.role}</td>
            <td>${statusLabels[paymentStatus]}</td>
            <td>
              <button class="status-btn" data-member-id="${member.member_id}" data-status="pending">
                確認中
              </button>
              <button class="status-btn" data-member-id="${member.member_id}" data-status="approved">
                承認
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function createEvent(title, amount, hostId) {
    const newEvent = {
      event_id: Date.now(),
      title,
      amount,
      host_id: hostId,
      payments: {},
    };

    members.forEach((member) => {
      newEvent.payments[member.member_id] = 'unpaid';
    });

    events.push(newEvent);
    renderPaymentList();
    return newEvent;
  }

  function updatePaymentStatus(memberId, status) {
    const latestEvent = events[events.length - 1];
    if (!latestEvent) return;

    latestEvent.payments[memberId] = status;
    renderPaymentList();
  }

  eventForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = eventTitleInput.value.trim();
    const amount = Number(eventAmountInput.value);
    const hostId = Number(eventHostSelect.value);

    if (!title || !amount) {
      alert('イベント名と金額を入力してください');
      return;
    }

    createEvent(title, amount, hostId);
    alert(`${title} を作成しました（${amount}円）`);
  });

  memberForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = memberNameInput.value.trim();
    if (!name) {
      alert('名前を入力してください');
      return;
    }

    const newMember = {
      member_id: Date.now(),
      name,
      role: 'メンバー',
    };

    members.push(newMember);
    memberNameInput.value = '';
    renderHostOptions();
    renderPaymentList();
  });

  paymentList.addEventListener('click', (event) => {
    const button = event.target.closest('.status-btn');
    if (!button) return;

    const memberId = Number(button.dataset.memberId);
    const status = button.dataset.status;
    updatePaymentStatus(memberId, status);
  });

  renderHostOptions();
  renderPaymentList();
});
