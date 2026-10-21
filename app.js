const appState = {
  users: [],
  circles: [],
  memberships: [],
  events: [],
};

function createId(prefix) {
  const randomPart = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

function findUserById(userId) {
  return appState.users.find((user) => user.userId === userId) || null;
}

function findCircleById(circleId) {
  return appState.circles.find((circle) => circle.circleId === circleId) || null;
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
  const memberships = appState.memberships.filter(
    (membership) => membership.circleId === circleId
  );

  return memberships.map((membership) => {
    const user = findUserById(membership.userId);
    return {
      ...membership,
      name: user ? user.name : 'Unknown',
    };
  });
}

function getCircleLeaderIds(circleId) {
  return appState.memberships
    .filter(
      (membership) =>
        membership.circleId === circleId && membership.role === 'leader'
    )
    .map((membership) => membership.userId);
}

function isLeader(userId, circleId) {
  return getCircleLeaderIds(circleId).includes(userId);
}

function createUser({ name, email = '', snsId = '' } = {}) {
  if (!name || !name.trim()) {
    throw new Error('ユーザー名は必須です');
  }

  const user = {
    userId: createId('user'),
    name: name.trim(),
    email,
    snsId,
    createdAt: new Date().toISOString(),
  };

  appState.users.push(user);
  return user;
}

function generateInviteUrl(circleId, baseUrl = 'https://example.com/circle') {
  return `${baseUrl}/${circleId}`;
}

function createCircle({ name, createdByUserId, baseUrl = 'https://example.com/circle' }) {
  const creator = findUserById(createdByUserId);
  if (!creator) {
    throw new Error('作成者が見つかりません');
  }

  const circle = {
    circleId: createId('circle'),
    name: name.trim(),
    createdByUserId,
    inviteUrl: '',
    createdAt: new Date().toISOString(),
  };

  circle.inviteUrl = generateInviteUrl(circle.circleId, baseUrl);
  appState.circles.push(circle);

  const leaderMembership = {
    membershipId: createId('membership'),
    userId: createdByUserId,
    circleId: circle.circleId,
    memberId: createId('member'),
    role: 'leader',
    joinedAt: new Date().toISOString(),
  };

  appState.memberships.push(leaderMembership);
  return circle;
}

function joinCircle({ userId, circleId }) {
  const user = findUserById(userId);
  const circle = findCircleById(circleId);

  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  if (!circle) {
    throw new Error('そのサークルは存在しません');
  }

  const existingMembership = getMembershipForUserInCircle(userId, circleId);
  if (existingMembership) {
    return existingMembership;
  }

  const newMembership = {
    membershipId: createId('membership'),
    userId,
    circleId,
    memberId: createId('member'),
    role: 'member',
    joinedAt: new Date().toISOString(),
  };

  appState.memberships.push(newMembership);
  return newMembership;
}

function grantLeaderRole({ actingUserId, circleId, targetUserId }) {
  const actingMembership = getMembershipForUserInCircle(actingUserId, circleId);
  const targetMembership = getMembershipForUserInCircle(targetUserId, circleId);

  if (!actingMembership) {
    throw new Error('実行者はそのサークルのメンバーではありません');
  }

  if (!isLeader(actingUserId, circleId)) {
    throw new Error('幹部権限がないため実行できません');
  }

  if (!targetMembership) {
    throw new Error('対象ユーザーはそのサークルに参加していません');
  }

  targetMembership.role = 'leader';
  return targetMembership;
}

function createEvent({
  circleId,
  createdByUserId,
  title,
  amount,
  notes = '',
  targetMemberIds = [],
}) {
  const circle = findCircleById(circleId);
  if (!circle) {
    throw new Error('対象のサークルが存在しません');
  }

  if (!isLeader(createdByUserId, circleId)) {
    throw new Error('幹部権限を持つ人だけがイベントを作成できます');
  }

  if (!title || !title.trim()) {
    throw new Error('イベント名は必須です');
  }

  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error('金額は0より大きい数値を設定してください');
  }

  const availableMembers = getCircleMembers(circleId);
  const finalTargetMemberIds =
    targetMemberIds.length > 0
      ? targetMemberIds.filter((memberId) =>
          availableMembers.some((member) => member.memberId === memberId)
        )
      : availableMembers.map((member) => member.memberId);

  if (finalTargetMemberIds.length === 0) {
    throw new Error('対象メンバーを1人以上選択してください');
  }

  const event = {
    eventId: createId('event'),
    circleId,
    createdByUserId,
    title: title.trim(),
    amount: Number(amount),
    notes: notes.trim(),
    targetMemberIds: finalTargetMemberIds,
    paymentStatus: {},
    createdAt: new Date().toISOString(),
  };

  finalTargetMemberIds.forEach((memberId) => {
    event.paymentStatus[memberId] = 'unpaid';
  });

  appState.events.push(event);
  return event;
}

function getMyMembershipInCircle(userId, circleId) {
  return getMembershipForUserInCircle(userId, circleId);
}

function getMyEventsForCircle({ userId, circleId }) {
  const myMembership = getMyMembershipInCircle(userId, circleId);
  if (!myMembership) {
    return [];
  }

  return appState.events
    .filter(
      (event) =>
        event.circleId === circleId &&
        event.targetMemberIds.includes(myMembership.memberId)
    )
    .map((event) => ({
      eventId: event.eventId,
      title: event.title,
      amount: event.amount,
      notes: event.notes,
      status: event.paymentStatus[myMembership.memberId] || 'unpaid',
      createdAt: event.createdAt,
    }));
}

function getEventStatusSummary(circleId, eventId) {
  const event = appState.events.find(
    (item) => item.circleId === circleId && item.eventId === eventId
  );

  if (!event) {
    return [];
  }

  return getCircleMembers(circleId).map((member) => ({
    memberId: member.memberId,
    name: member.name,
    role: member.role,
    status: event.paymentStatus[member.memberId] || 'unpaid',
  }));
}

function updatePaymentStatus({
  actingUserId,
  circleId,
  eventId,
  memberId,
  status,
}) {
  const validStatuses = ['unpaid', 'pending', 'paid'];
  if (!validStatuses.includes(status)) {
    throw new Error('ステータスは unpaid, pending, paid のいずれかにしてください');
  }

  const event = appState.events.find(
    (item) => item.circleId === circleId && item.eventId === eventId
  );

  if (!event) {
    throw new Error('対象イベントが存在しません');
  }

  const targetMembership = appState.memberships.find(
    (membership) =>
      membership.circleId === circleId && membership.memberId === memberId
  );

  if (!targetMembership) {
    throw new Error('対象メンバーがそのサークルに存在しません');
  }

  const actingMembership = getMembershipForUserInCircle(actingUserId, circleId);
  if (!actingMembership) {
    throw new Error('操作者はそのサークルに参加していません');
  }

  const isActingMember = actingMembership.memberId === memberId;
  const isActingLeader = isLeader(actingUserId, circleId);

  if (!isActingLeader && !isActingMember) {
    throw new Error('このメンバーの支払い状況は更新できません');
  }

  if (isActingMember && !isActingLeader && status !== 'pending') {
    throw new Error('一般メンバーは「承認待ち」状態のみ更新できます');
  }

  if (!event.targetMemberIds.includes(memberId)) {
    throw new Error('そのイベントの対象メンバーではありません');
  }

  event.paymentStatus[memberId] = status;
  return event.paymentStatus[memberId];
}

function findEventById(eventId) {
  return appState.events.find((event) => event.eventId === eventId) || null;
}

function getCircleSummary(circleId) {
  const circle = findCircleById(circleId);
  if (!circle) {
    throw new Error('サークルが存在しません');
  }

  const members = getCircleMembers(circleId);
  const events = appState.events.filter((event) => event.circleId === circleId);

  return {
    circle,
    members,
    events,
    totalMembers: members.length,
    totalEvents: events.length,
  };
}

const accountingSystem = {
  appState,
  createUser,
  createCircle,
  joinCircle,
  grantLeaderRole,
  createEvent,
  getCircleMembers,
  getMyEventsForCircle,
  getEventStatusSummary,
  updatePaymentStatus,
  getCircleSummary,
  findEventById,
  generateInviteUrl,
};

if (typeof window !== 'undefined') {
  window.accountingSystem = accountingSystem;
}

if (typeof module !== 'undefined') {
  module.exports = accountingSystem;
}
