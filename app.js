const appState = {
  currentUser: null,
  selectedCircleId: null,
  currentCircleId: null,
  selectedEventId: null,
  editingEventId: null,
  changingParticipantId: null,
  users: [],
  circles: [],
  memberships: [],
  events: [],
};

const STATUS_LABELS = {
  unpaid: '未入金',
  pending: '承認待ち',
  approved: '承認済み',
};

const STATUS_VALUES = {
  未入金: 'unpaid',
  承認待ち: 'pending',
  承認済み: 'approved',
};

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function createRoomId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let roomId = '';

  do {
    roomId = Array.from({ length: 6 }, () =>
      characters[Math.floor(Math.random() * characters.length)]
    ).join('');
  } while (findCircleById(roomId));

  return roomId;
}

function normalizeString(value) {
  return String(value ?? '').trim();
}

function findUserById(userId) {
  return appState.users.find((user) => user.userId === userId) || null;
}

function findCircleById(circleId) {
  return appState.circles.find((circle) => circle.circleId === circleId) || null;
}

function findEventById(eventId) {
  return appState.events.find((event) => event.eventId === eventId) || null;
}

function getMembershipForUserInCircle(userId, circleId) {
  return (
    appState.memberships.find(
      (membership) =>
        membership.userId === userId && membership.circleId === circleId
    ) || null
  );
}

function getCircleMembers(circleId) {
  return appState.memberships
    .filter((membership) => membership.circleId === circleId)
    .map((membership) => {
      const user = findUserById(membership.userId);
      return {
        ...membership,
        name: user ? user.name : 'Unknown',
      };
    });
}

function getCircleLeaderIds(circleId) {
  return getCircleMembers(circleId)
    .filter((membership) => membership.role === 'leader')
    .map((membership) => membership.userId);
}

function isLeader(userId, circleId) {
  return getCircleLeaderIds(circleId).includes(userId);
}

function registerUser({ name, email = '', snsId = '' } = {}) {
  const safeName = normalizeString(name);
  const safeEmail = normalizeString(email);
  const safeSnsId = normalizeString(snsId);

  if (!safeName) {
    throw new Error('ユーザー名は必須です');
  }
  if (safeEmail && findUserByEmail(safeEmail)) {
    throw new Error('このメールアドレスはすでに登録されています');
  }
  if (safeSnsId && findUserBySnsId(safeSnsId)) {
    throw new Error('このSNS IDはすでに登録されています');
  }

  const user = {
    userId: createId('user'),
    name: safeName,
    email: safeEmail,
    snsId: safeSnsId,
    createdAt: new Date().toISOString(),
  };
  appState.users.push(user);
  return user;
}

function createUser(options) {
  return registerUser(options);
}

function findUserByEmail(email) {
  const normalizedEmail = normalizeString(email).toLowerCase();
  return (
    appState.users.find(
      (user) => normalizeString(user.email).toLowerCase() === normalizedEmail
    ) || null
  );
}

function findUserBySnsId(snsId) {
  const normalizedSnsId = normalizeString(snsId).toLowerCase();
  return (
    appState.users.find(
      (user) => normalizeString(user.snsId).toLowerCase() === normalizedSnsId
    ) || null
  );
}

function loginUser({ email = '', snsId = '' } = {}) {
  const user = findUserByEmail(email) || findUserBySnsId(snsId);
  if (!user) {
    throw new Error('該当するユーザーが見つかりません');
  }
  return user;
}

function getUserByLoginInfo(options) {
  return loginUser(options);
}

function generateInviteUrl(circleId, baseUrl = 'https://example.com/circle') {
  return `${baseUrl.replace(/\/$/, '')}/${circleId}`;
}

function createCircle({
  name,
  createdByUserId,
  baseUrl = 'https://example.com/circle',
} = {}) {
  const safeName = normalizeString(name);
  if (!safeName) {
    throw new Error('サークル名は必須です');
  }
  if (!findUserById(createdByUserId)) {
    throw new Error('作成者が見つかりません');
  }

  const circle = {
    circleId: createRoomId(),
    name: safeName,
    createdByUserId,
    inviteUrl: '',
    createdAt: new Date().toISOString(),
  };
  circle.inviteUrl = generateInviteUrl(circle.circleId, baseUrl);
  appState.circles.push(circle);
  appState.memberships.push({
    membershipId: createId('membership'),
    userId: createdByUserId,
    circleId: circle.circleId,
    memberId: createId('member'),
    role: 'leader',
    joinedAt: new Date().toISOString(),
  });
  return circle;
}

function joinCircle({ userId, circleId } = {}) {
  if (!findUserById(userId)) {
    throw new Error('ユーザーが見つかりません');
  }
  if (!findCircleById(circleId)) {
    throw new Error('そのサークルは存在しません');
  }

  const existingMembership = getMembershipForUserInCircle(userId, circleId);
  if (existingMembership) {
    return existingMembership;
  }

  const membership = {
    membershipId: createId('membership'),
    userId,
    circleId,
    memberId: createId('member'),
    role: 'member',
    joinedAt: new Date().toISOString(),
  };
  appState.memberships.push(membership);
  return membership;
}

function grantLeaderRole({ actingUserId, circleId, targetUserId } = {}) {
  if (!getMembershipForUserInCircle(actingUserId, circleId)) {
    throw new Error('実行者はそのサークルのメンバーではありません');
  }
  if (!isLeader(actingUserId, circleId)) {
    throw new Error('幹部権限がないため実行できません');
  }

  const targetMembership = getMembershipForUserInCircle(targetUserId, circleId);
  if (!targetMembership) {
    throw new Error('対象ユーザーはそのサークルに参加していません');
  }
  targetMembership.role = 'leader';
  return targetMembership;
}

function leaveCircle({ userId, circleId } = {}) {
  const membership = getMembershipForUserInCircle(userId, circleId);
  if (!membership) {
    throw new Error('そのサークルのメンバーではありません');
  }

  if (membership.role === 'leader' && getCircleLeaderIds(circleId).length === 1) {
    throw new Error('幹部が一人だけのため、サークルを抜けることはできません');
  }

  appState.memberships = appState.memberships.filter(
    (item) => item.membershipId !== membership.membershipId
  );
  return membership;
}

function normalizeDateValue(dateValue) {
  if (!dateValue) return null;
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) {
    throw new Error('期限は有効な日付を指定してください');
  }
  return value.toISOString();
}

function getDeadlineStatus(deadlineIso) {
  if (!deadlineIso) {
    return { deadline: null, isExpired: false, statusText: '期限なし' };
  }
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) {
    throw new Error('期限は有効な日付を指定してください');
  }
  const isExpired = new Date() > deadline;
  return {
    deadline: deadline.toISOString(),
    isExpired,
    statusText: isExpired ? '期限切れ' : '期限内',
  };
}

function createEvent({
  circleId,
  createdByUserId,
  title,
  amount,
  notes = '',
  targetMemberIds = [],
  deadline = null,
} = {}) {
  if (!findCircleById(circleId)) {
    throw new Error('そのサークルは存在しません');
  }
  if (!getMembershipForUserInCircle(createdByUserId, circleId)) {
    throw new Error('作成者はそのサークルのメンバーではありません');
  }
  if (!isLeader(createdByUserId, circleId)) {
    throw new Error('幹部権限がないためイベントを追加できません');
  }
  const safeTitle = normalizeString(title);
  const numericAmount = Number(amount);
  if (!safeTitle) throw new Error('イベント名は必須です');
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('金額は0より大きい数値を設定してください');
  }

  const members = getCircleMembers(circleId);
  const memberIds = members.map((member) => member.memberId);
  const selectedIds =
    targetMemberIds.length > 0
      ? targetMemberIds.filter((memberId) => memberIds.includes(memberId))
      : memberIds;
  const event = {
    eventId: createId('event'),
    circleId,
    createdByUserId,
    title: safeTitle,
    amount: numericAmount,
    notes: normalizeString(notes),
    targetMemberIds: selectedIds,
    deadline: normalizeDateValue(deadline),
    paymentStatus: {},
    createdAt: new Date().toISOString(),
  };
  appState.events.push(event);
  return event;
}

function getMyEventsForCircle(circleId, userId) {
  const membership = getMembershipForUserInCircle(userId, circleId);
  if (!membership) return [];
  return appState.events
    .filter(
      (event) =>
        event.circleId === circleId &&
        event.targetMemberIds.includes(membership.memberId)
    )
    .map((event) => {
      const deadline = getDeadlineStatus(event.deadline);
      return {
        eventId: event.eventId,
        title: event.title,
        amount: event.amount,
        notes: event.notes,
        deadline: deadline.deadline,
        deadlineStatus: deadline.statusText,
        isExpired: deadline.isExpired,
        status: event.paymentStatus[membership.memberId] || 'unpaid',
        createdAt: event.createdAt,
      };
    });
}

function getEventStatusSummary(circleId, eventId) {
  const event = findEventById(eventId);
  if (!event || event.circleId !== circleId) return [];
  const deadline = getDeadlineStatus(event.deadline);
  return getCircleMembers(circleId)
    .filter((member) => event.targetMemberIds.includes(member.memberId))
    .map((member) => ({
      memberId: member.memberId,
      name: member.name,
      role: member.role,
      status: event.paymentStatus[member.memberId] || 'unpaid',
      deadline: deadline.deadline,
      deadlineStatus: deadline.statusText,
      isExpired: deadline.isExpired,
    }));
}

function getEventDeadlineInfo(circleId, eventId) {
  const event = findEventById(eventId);
  return event && event.circleId === circleId ? getDeadlineStatus(event.deadline) : null;
}

function updatePaymentStatus({
  actingUserId,
  circleId,
  eventId,
  memberId,
  targetMemberId,
  status,
} = {}) {
  const event = findEventById(eventId);
  const selectedMemberId = memberId || targetMemberId;
  if (!event || event.circleId !== circleId) {
    throw new Error('イベントが見つかりません');
  }
  if (!isLeader(actingUserId, circleId)) {
    throw new Error('幹部権限がないため実行できません');
  }
  if (!event.targetMemberIds.includes(selectedMemberId)) {
    throw new Error('対象ユーザーはこのイベントの参加者ではありません');
  }
  const normalizedStatus = STATUS_VALUES[status] || status;
  if (!Object.prototype.hasOwnProperty.call(STATUS_LABELS, normalizedStatus)) {
    throw new Error('無効な入金状態です');
  }
  const currentStatus = event.paymentStatus[selectedMemberId] || 'unpaid';
  if (normalizedStatus === 'pending') {
    throw new Error('メンバーの入金申請後に承認または却下してください');
  }
  if (normalizedStatus === 'approved' && currentStatus !== 'pending') {
    throw new Error('メンバーが入金確認を申請するまで承認できません');
  }
  if (normalizedStatus === 'unpaid' && currentStatus !== 'pending' && currentStatus !== 'approved') {
    throw new Error('承認待ちまたは承認済みの状態だけ却下できます');
  }
  event.paymentStatus[selectedMemberId] = normalizedStatus;
  return event;
}

function markPaymentPending({ userId, circleId, eventId } = {}) {
  const event = findEventById(eventId);
  const membership = getMembershipForUserInCircle(userId, circleId);
  if (!event || event.circleId !== circleId) {
    throw new Error('イベントが見つかりません');
  }
  if (!membership || !event.targetMemberIds.includes(membership.memberId)) {
    throw new Error('このイベントの参加者ではありません');
  }
  const status = event.paymentStatus[membership.memberId] || 'unpaid';
  if (status !== 'unpaid') {
    throw new Error('現在の状態では入金確認を申請できません');
  }
  event.paymentStatus[membership.memberId] = 'pending';
  return event;
}

function revertPaymentPending({ userId, circleId, eventId } = {}) {
  const event = findEventById(eventId);
  const membership = getMembershipForUserInCircle(userId, circleId);
  if (!event || event.circleId !== circleId) {
    throw new Error('イベントが見つかりません');
  }
  if (!membership || !event.targetMemberIds.includes(membership.memberId)) {
    throw new Error('このイベントの参加者ではありません');
  }
  if (event.paymentStatus[membership.memberId] !== 'pending') {
    throw new Error('確認中のイベントだけ元に戻せます');
  }
  event.paymentStatus[membership.memberId] = 'unpaid';
  return event;
}

function getCircleSummary(circleId) {
  const circle = findCircleById(circleId);
  if (!circle) return null;
  return {
    ...circle,
    members: getCircleMembers(circleId),
    events: appState.events.filter((event) => event.circleId === circleId),
  };
}

function getCurrentCircleEvents() {
  return appState.events.filter((event) => event.circleId === appState.currentCircleId);
}

function isCurrentUserLeader() {
  return Boolean(
    appState.currentUser &&
      appState.currentCircleId &&
      isLeader(appState.currentUser.userId, appState.currentCircleId)
  );
}

function getVisibleEvents() {
  if (isCurrentUserLeader()) {
    return getCurrentCircleEvents();
  }
  return appState.currentUser
    ? getMyEventsForCircle(appState.currentCircleId, appState.currentUser.userId)
        .map((item) => findEventById(item.eventId))
        .filter(Boolean)
    : [];
}

function seedTestData() {
  if (appState.circles.length > 0) return;

  const testUsers = [
    { userId: 's001', name: '田中 太郎' },
    { userId: 's002', name: '山田 花子' },
    { userId: 's003', name: '佐藤 次郎' },
  ];

  testUsers.forEach((user) => {
    appState.users.push({
      ...user,
      email: '',
      snsId: '',
      createdAt: new Date().toISOString(),
    });
  });

  const testCircles = [
    { circleId: 'SCCR01', name: 'サッカーサークル' },
    { circleId: 'ICCL01', name: 'インカレサークル' },
  ];

  testCircles.forEach((circle) => {
    appState.circles.push({
      ...circle,
      createdByUserId: 's001',
      inviteUrl: generateInviteUrl(circle.circleId),
      createdAt: new Date().toISOString(),
    });

    testUsers.forEach((user, index) => {
      appState.memberships.push({
        membershipId: `${circle.circleId}_membership_${user.userId}`,
        userId: user.userId,
        circleId: circle.circleId,
        memberId: `${circle.circleId}_member_${user.userId}`,
        role: index === 0 ? 'leader' : 'member',
        joinedAt: new Date().toISOString(),
      });
    });
  });
}

function getSelectedEvent() {
  return findEventById(appState.selectedEventId);
}

function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
}

function renderCircleTabs() {
  const tabs = document.getElementById('circle-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';

  const circles = appState.currentUser
    ? appState.memberships
        .filter((membership) => membership.userId === appState.currentUser.userId)
        .map((membership) => findCircleById(membership.circleId))
        .filter(Boolean)
    : [];

  if (!appState.currentUser || circles.length === 0) {
    tabs.hidden = true;
    appState.currentCircleId = null;
    appState.selectedCircleId = null;
    return;
  }

  if (!appState.selectedCircleId || !circles.some((circle) => circle.circleId === appState.selectedCircleId)) {
    appState.selectedCircleId = circles[0].circleId;
  }

  appState.currentCircleId = appState.selectedCircleId;
  if (appState.selectedEventId && !getVisibleEvents().some((event) => event.eventId === appState.selectedEventId)) {
    appState.selectedEventId = null;
  }

  tabs.hidden = false;
  circles.forEach((circle) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'circle-tab';
    tab.textContent = circle.name;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(circle.circleId === appState.selectedCircleId));
    tab.classList.toggle('active', circle.circleId === appState.selectedCircleId);
    tab.addEventListener('click', () => {
      appState.selectedCircleId = circle.circleId;
      appState.currentCircleId = circle.circleId;
      appState.selectedEventId = null;
      renderAll();
    });
    tabs.appendChild(tab);
  });
}

function renderEventList() {
  const list = document.getElementById('event-list');
  if (!list) return;
  list.innerHTML = '';

  const visibleEvents = getVisibleEvents();
  visibleEvents.forEach((event) => {
    const item = document.createElement('li');
    item.dataset.eventId = event.eventId;
    item.className = 'event-list-item';
    item.classList.toggle('is-open', event.eventId === appState.selectedEventId);

    const summary = document.createElement('button');
    summary.type = 'button';
    summary.className = 'event-summary';
    summary.innerHTML = `
      <span class="event-summary__title">${event.title}</span>
      <span class="event-summary__meta">${event.deadline ? new Date(event.deadline).toLocaleDateString('ja-JP') : '日付なし'}</span>
    `;

    summary.addEventListener('click', () => {
      appState.selectedEventId = appState.selectedEventId === event.eventId ? null : event.eventId;
      renderAll();
    });

    item.appendChild(summary);

    if (event.eventId === appState.selectedEventId) {
      const detail = document.createElement('div');
      detail.className = 'event-detail-inline';

      const meta = document.createElement('div');
      meta.className = 'event-detail-inline__meta';
      meta.innerHTML = `
        <span>金額: ¥${event.amount.toLocaleString()}</span>
        <span>${event.deadline ? new Date(event.deadline).toLocaleDateString('ja-JP') : '日付なし'}</span>
      `;
      detail.appendChild(meta);

      if (isCurrentUserLeader()) {
        const participantList = document.createElement('div');
        participantList.className = 'event-participant-list';

        getEventStatusSummary(event.circleId, event.eventId).forEach((participant) => {
          const row = document.createElement('div');
          row.className = 'event-participant-row';

          const left = document.createElement('div');
          left.className = 'event-participant-row__name';
          left.textContent = participant.name;

          const status = document.createElement('div');
          status.className = 'event-participant-row__status';
          status.textContent = STATUS_LABELS[participant.status];

          const actions = document.createElement('div');
          actions.className = 'event-participant-row__actions';
          if (participant.status === 'pending') {
            const approveButton = document.createElement('button');
            approveButton.type = 'button';
            approveButton.className = 'small-action approve-button';
            approveButton.textContent = '承認';
            approveButton.addEventListener('click', () =>
              handleLeaderPaymentDecision(event, participant.memberId, 'approved')
            );

            const rejectButton = document.createElement('button');
            rejectButton.type = 'button';
            rejectButton.className = 'small-action reject-button';
            rejectButton.textContent = '却下';
            rejectButton.addEventListener('click', () =>
              handleLeaderPaymentDecision(event, participant.memberId, 'unpaid')
            );

            actions.append(approveButton, rejectButton);
          }

          row.append(left, status, actions);
          participantList.appendChild(row);
        });

        detail.appendChild(participantList);
      } else if (appState.currentUser) {
        const membership = getMembershipForUserInCircle(
          appState.currentUser.userId,
          event.circleId
        );
        const memberId = membership?.memberId;
        const status = memberId ? event.paymentStatus[memberId] || 'unpaid' : 'unpaid';
        const memberButton = document.createElement('button');
        memberButton.type = 'button';
        memberButton.className = 'payment-button';
        memberButton.textContent =
          status === 'pending'
            ? '確認中'
            : status === 'approved'
              ? '承認済み'
              : '入金報告';
        memberButton.disabled = status === 'approved';
        memberButton.classList.toggle('is-pending', status === 'pending');
        memberButton.addEventListener('click', (clickEvent) => {
          clickEvent.stopPropagation();
          handleMemberPayment(event, status);
        });
        detail.appendChild(memberButton);
      }

      item.appendChild(detail);
    }

    list.appendChild(item);
  });
}

function renderEventDetail() {
  const detailPanel = document.getElementById('event-detail-panel');
  const participantPanel = document.getElementById('participant-panel');
  if (!detailPanel || !participantPanel) return;
  detailPanel.hidden = true;
  participantPanel.hidden = true;
}

function renderParticipantCheckboxList() {
  const list = document.getElementById('participant-checkbox-list');
  if (!list) return;
  list.innerHTML = '';
  getCircleMembers(appState.currentCircleId).forEach((member) => {
    const item = document.createElement('li');
    item.innerHTML = `<label><input type="checkbox" value="${member.memberId}" checked /> ${member.name}</label>`;
    list.appendChild(item);
  });
}

function renderLoginState() {
  const loggedIn = Boolean(appState.currentUser);
  const hasJoinedCircle = Boolean(appState.currentCircleId);
  const canManageCircle =
    loggedIn &&
    hasJoinedCircle &&
    isLeader(appState.currentUser.userId, appState.currentCircleId);

  document.querySelector('.login-panel').hidden = loggedIn;
  document.getElementById('menu-toggle').hidden = !loggedIn;
  if (!loggedIn) {
    closeMenu();
  }
  document.getElementById('event-panel').hidden = !hasJoinedCircle;
  document.querySelector('.add-event-button').hidden = !canManageCircle;
  document.querySelector('.header-add-circle-button').hidden = !loggedIn;
  document.getElementById('event-detail-panel').hidden = true;
  document.getElementById('participant-panel').hidden = true;

  const circleRoomBar = document.getElementById('circle-room-bar');
  if (circleRoomBar) {
    const shouldHideRoomBar = !loggedIn || !hasJoinedCircle;
    circleRoomBar.hidden = shouldHideRoomBar;
    circleRoomBar.style.display = shouldHideRoomBar ? 'none' : 'flex';
  }

  renderCircleTabs();
}

function renderCircleRoomBar() {
  const roomBar = document.getElementById('circle-room-bar');
  const roomIdEl = document.getElementById('circle-room-id');
  const copyButton = document.getElementById('copy-room-id-button');

  if (!roomBar || !roomIdEl || !copyButton) return;

  const shouldShow = Boolean(appState.currentUser && appState.currentCircleId);
  roomBar.hidden = !shouldShow;
  roomBar.style.display = shouldShow ? 'flex' : 'none';

  if (!shouldShow) {
    roomIdEl.textContent = '-';
    copyButton.disabled = true;
    return;
  }

  const currentCircle = findCircleById(appState.currentCircleId);
  roomIdEl.textContent = currentCircle ? currentCircle.circleId : '-';
  copyButton.disabled = !currentCircle;
  if (!currentCircle) return;

  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(currentCircle.circleId);
      copyButton.textContent = 'コピー済み';
      setTimeout(() => {
        copyButton.textContent = 'コピー';
      }, 1200);
    } catch (error) {
      const fallback = document.createElement('textarea');
      fallback.value = currentCircle.circleId;
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      document.body.removeChild(fallback);
      copyButton.textContent = 'コピー済み';
      setTimeout(() => {
        copyButton.textContent = 'コピー';
      }, 1200);
    }
  };
}

function renderAll() {
  renderLoginState();
  renderCircleRoomBar();
  renderEventList();
  renderEventDetail();
  renderParticipantCheckboxList();
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const userId = normalizeString(document.getElementById('user-id').value);
  const name = normalizeString(document.getElementById('user-name').value);
  if (!userId || !name) {
    alert('ユーザーIDと名前を入力してください');
    return;
  }
  let user = findUserById(userId);
  if (!user) {
    user = { userId, name, email: '', snsId: '', createdAt: new Date().toISOString() };
    appState.users.push(user);
  } else {
    user.name = name;
  }
  appState.currentUser = user;
  const membership = appState.memberships.find((item) => item.userId === user.userId);
  appState.selectedCircleId = membership ? membership.circleId : null;
  appState.currentCircleId = appState.selectedCircleId;
  appState.selectedEventId = null;
  renderAll();
}

function handleCreateCircle() {
  const name = normalizeString(prompt('サークル名を入力してください'));
  if (!name || !appState.currentUser) return;
  const circle = createCircle({ name, createdByUserId: appState.currentUser.userId });
  appState.selectedCircleId = circle.circleId;
  appState.currentCircleId = circle.circleId;
  appState.selectedEventId = null;
  alert(`サークルを作成しました。\n部屋ID: ${circle.circleId}`);
  closeMenu();
  renderAll();
}

function handleJoinCircle() {
  if (!appState.currentUser) return;

  const roomId = normalizeString(prompt('参加するサークルの部屋ID（6桁）を入力してください'));
  if (!roomId) return;
  if (!/^[A-Za-z0-9]{6}$/.test(roomId)) {
    alert('部屋IDは6桁の英数字で入力してください');
    return;
  }

  try {
    joinCircle({
      userId: appState.currentUser.userId,
      circleId: roomId,
    });
    appState.selectedCircleId = roomId;
    appState.currentCircleId = roomId;
    appState.selectedEventId = null;
    alert(`${findCircleById(roomId).name}に参加しました`);
    closeMenu();
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

function handleProfileSettings() {
  if (!appState.currentUser) return;
  const name = normalizeString(prompt('新しい名前を入力してください', appState.currentUser.name));
  if (!name) return;
  appState.currentUser.name = name;
  closeMenu();
  renderAll();
}

function handleLeaveCircle() {
  if (!appState.currentUser || !appState.currentCircleId) return;
  try {
    leaveCircle({
      userId: appState.currentUser.userId,
      circleId: appState.currentCircleId,
    });
    const nextMembership = appState.memberships.find(
      (membership) => membership.userId === appState.currentUser.userId
    );
    appState.currentCircleId = nextMembership ? nextMembership.circleId : null;
    appState.selectedCircleId = appState.currentCircleId;
    appState.selectedEventId = null;
    closeMenu();
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

function handleLogout() {
  appState.currentUser = null;
  appState.selectedCircleId = null;
  appState.currentCircleId = null;
  appState.selectedEventId = null;
  closeMenu();
  renderAll();
}

function closeMenu() {
  const menu = document.getElementById('app-menu');
  const toggle = document.getElementById('menu-toggle');
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
}

function toggleMenu() {
  if (!appState.currentUser) return;
  const menu = document.getElementById('app-menu');
  const toggle = document.getElementById('menu-toggle');
  const isOpen = !menu.hidden;
  menu.hidden = isOpen;
  toggle.setAttribute('aria-expanded', String(!isOpen));
}

function handleMemberPayment(event, status) {
  if (!appState.currentUser) return;
  try {
    if (status === 'pending') {
      if (confirm('元に戻しますか？')) {
        revertPaymentPending({
          userId: appState.currentUser.userId,
          circleId: event.circleId,
          eventId: event.eventId,
        });
      }
    } else if (status === 'unpaid') {
      markPaymentPending({
        userId: appState.currentUser.userId,
        circleId: event.circleId,
        eventId: event.eventId,
      });
    }
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

function handleLeaderPaymentDecision(event, memberId, status) {
  if (!appState.currentUser || !isCurrentUserLeader()) return;
  try {
    updatePaymentStatus({
      actingUserId: appState.currentUser.userId,
      circleId: event.circleId,
      eventId: event.eventId,
      memberId,
      status,
    });
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

function handleAddEventSubmit(event) {
  event.preventDefault();
  if (!appState.currentUser || !appState.currentCircleId) {
    alert('先にサークルを選択してください');
    return;
  }
  if (!isLeader(appState.currentUser.userId, appState.currentCircleId)) {
    alert('幹部権限がないためイベントを追加できません');
    return;
  }
  const title = normalizeString(document.getElementById('event-name').value);
  const amount = Number(document.getElementById('event-amount').value);
  const deadline = document.getElementById('event-date').value;
  const targetMemberIds = [...document.querySelectorAll('#participant-checkbox-list input:checked')].map(
    (input) => input.value
  );
  try {
    const created = createEvent({
      circleId: appState.currentCircleId,
      createdByUserId: appState.currentUser.userId,
      title,
      amount,
      targetMemberIds,
      deadline,
    });
    appState.selectedEventId = created.eventId;
    closeModal('add-event-modal');
    document.getElementById('add-event-form').reset();
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

function handleEditEventSubmit(event) {
  event.preventDefault();
  if (!isCurrentUserLeader()) {
    alert('幹部権限がないためイベントを編集できません');
    return;
  }
  const selected = getSelectedEvent();
  if (!selected) return;
  selected.title = normalizeString(document.getElementById('edit-event-name').value);
  selected.amount = Number(document.getElementById('edit-event-amount').value);
  selected.deadline = normalizeDateValue(document.getElementById('edit-event-date').value);
  closeModal('edit-event-modal');
  renderAll();
}

function bindGlobalEvents() {
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('menu-toggle').addEventListener('click', toggleMenu);
  document.getElementById('menu-close').addEventListener('click', closeMenu);
  document.querySelector('.header-add-circle-button').addEventListener('click', handleCreateCircle);
  document.getElementById('profile-settings-button').addEventListener('click', handleProfileSettings);
  document.getElementById('leave-circle-button').addEventListener('click', handleLeaveCircle);
  document.getElementById('menu-add-circle-button').addEventListener('click', handleCreateCircle);
  document.getElementById('join-circle-button').addEventListener('click', handleJoinCircle);
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.querySelector('.add-event-button').addEventListener('click', () => {
    if (
      !appState.currentUser ||
      !appState.currentCircleId ||
      !isLeader(appState.currentUser.userId, appState.currentCircleId)
    ) {
      return;
    }
    renderParticipantCheckboxList();
    showModal('add-event-modal');
  });
  document.getElementById('add-event-form').addEventListener('submit', handleAddEventSubmit);
  document.querySelector('.edit-event-button').addEventListener('click', () => {
    if (!isCurrentUserLeader()) {
      return;
    }
    const selected = getSelectedEvent();
    if (!selected) return;
    document.getElementById('edit-event-name').value = selected.title;
    document.getElementById('edit-event-amount').value = selected.amount;
    document.getElementById('edit-event-date').value = selected.deadline
      ? selected.deadline.slice(0, 10)
      : '';
    showModal('edit-event-modal');
  });
  document.querySelector('.delete-event-button').addEventListener('click', () => {
    if (!isCurrentUserLeader()) return;
    showModal('delete-event-modal');
  });
  document.querySelector('.confirm-delete-button').addEventListener('click', () => {
    if (!isCurrentUserLeader()) return;
    appState.events = appState.events.filter((event) => event.eventId !== appState.selectedEventId);
    appState.selectedEventId = null;
    closeModal('delete-event-modal');
    renderAll();
  });
  document.getElementById('edit-event-form').addEventListener('submit', handleEditEventSubmit);
  document.getElementById('status-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const selected = getSelectedEvent();
    if (!selected || !appState.currentUser) return;
    try {
      updatePaymentStatus({
        actingUserId: appState.currentUser.userId,
        circleId: selected.circleId,
        eventId: selected.eventId,
        memberId: appState.changingParticipantId,
        status: document.getElementById('status-select').value,
      });
      appState.changingParticipantId = null;
      closeModal('status-modal');
      renderAll();
    } catch (error) {
      alert(error.message);
    }
  });
  document.querySelectorAll('.modal-close, .modal-cancel').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.modal').id));
  });
}

seedTestData();

const accountingSystem = {
  appState,
  createUser,
  registerUser,
  loginUser,
  getUserByLoginInfo,
  findUserByEmail,
  findUserBySnsId,
  createCircle,
  joinCircle,
  grantLeaderRole,
  leaveCircle,
  createEvent,
  getCircleMembers,
  getMyEventsForCircle,
  getEventStatusSummary,
  getEventDeadlineInfo,
  updatePaymentStatus,
  markPaymentPending,
  revertPaymentPending,
  getCircleSummary,
  findEventById,
};

if (typeof window !== 'undefined') {
  window.accountingSystem = accountingSystem;
  window.accountingApp = { appState, getSelectedEvent, renderAll };
  document.addEventListener('DOMContentLoaded', () => {
    closeMenu();
    bindGlobalEvents();
    renderAll();
  });
}
