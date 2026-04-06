const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const eventDetail = document.getElementById("eventDetail");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const eventForm = document.getElementById("eventForm");
const formTitle = document.getElementById("formTitle");
const deleteEvent = document.getElementById("deleteEvent");
const eventTitle = document.getElementById("eventTitle");
const eventTime = document.getElementById("eventTime");
const eventLocation = document.getElementById("eventLocation");
const eventDescription = document.getElementById("eventDescription");
const commentForm = document.getElementById("commentForm");
const commentName = document.getElementById("commentName");
const commentText = document.getElementById("commentText");
const commentList = document.getElementById("commentList");
const commentEmpty = document.getElementById("commentEmpty");

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const eventStorageKey = "craftsForCareEvents";
const commentStorageKey = "craftsForCareComments";
const today = new Date();
const safeToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const defaultDate = `${safeToday.getFullYear()}-${String(safeToday.getMonth() + 1).padStart(2, "0")}-${String(safeToday.getDate()).padStart(2, "0")}`;

let eventMap = loadEvents();
let comments = loadComments();
let activeReplyCommentId = null;
let currentMonth = safeToday.getMonth();
let currentYear = safeToday.getFullYear();
let selectedDate = defaultDate;

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(eventStorageKey)) || {};
  } catch (error) {
    return {};
  }
}

function saveEvents() {
  localStorage.setItem(eventStorageKey, JSON.stringify(eventMap));
}

function loadComments() {
  try {
    const storedComments = JSON.parse(localStorage.getItem(commentStorageKey)) || [];
    if (!Array.isArray(storedComments)) {
      return [];
    }

    return storedComments
      .map((comment, index) => normalizeComment(comment, index))
      .filter((comment) => comment.name && comment.text);
  } catch (error) {
    return [];
  }
}

function saveComments() {
  localStorage.setItem(commentStorageKey, JSON.stringify(comments));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReply(reply, index) {
  return {
    id: reply?.id || `reply-${index}-${Date.now()}`,
    name: typeof reply?.name === "string" ? reply.name.trim() : "",
    text: typeof reply?.text === "string" ? reply.text.trim() : "",
    createdAt: reply?.createdAt || new Date().toISOString()
  };
}

function normalizeComment(comment, index) {
  const replies = Array.isArray(comment?.replies)
    ? comment.replies
        .map((reply, replyIndex) => normalizeReply(reply, replyIndex))
        .filter((reply) => reply.name && reply.text)
    : [];

  return {
    id: comment?.id || `comment-${index}-${Date.now()}`,
    name: typeof comment?.name === "string" ? comment.name.trim() : "",
    text: typeof comment?.text === "string" ? comment.text.trim() : "",
    createdAt: comment?.createdAt || new Date().toISOString(),
    replies
  };
}

function buildMeta(dateKey, event) {
  const pieces = [formatFullDate(dateKey)];
  if (event.time) pieces.push(event.time);
  if (event.location) pieces.push(event.location);
  return pieces.join(" • ");
}

function fillForm(dateKey) {
  const event = eventMap[dateKey];
  formTitle.textContent = `Plan ${formatFullDate(dateKey)}`;
  deleteEvent.disabled = !event;
}

function clearEventForm() {
  eventForm.reset();
  formTitle.textContent = `Plan ${formatFullDate(selectedDate)}`;
}

function updateEventDetail(dateKey) {
  const event = eventMap[dateKey];
  if (!event) {
    eventDetail.innerHTML = `
      <p class="event-detail__eyebrow">Selected date</p>
      <h4>No event yet</h4>
      <p class="event-detail__meta">${formatFullDate(dateKey)}</p>
      <p class="event-detail__text">Use the form to plan your own club activity for this date.</p>
    `;
    fillForm(dateKey);
    return;
  }

  eventDetail.innerHTML = `
    <p class="event-detail__eyebrow">Selected event</p>
    <h4>${event.title}</h4>
    <p class="event-detail__meta">${buildMeta(dateKey, event)}</p>
    <p class="event-detail__text">${event.description || "This event is planned for the selected date."}</p>
  `;
  fillForm(dateKey);
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatFullDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatCommentDate(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildCommentMeta(name, createdAt, className) {
  const wrapper = document.createElement("div");
  wrapper.className = className;

  const author = document.createElement("strong");
  author.textContent = name;

  const time = document.createElement("span");
  time.textContent = formatCommentDate(createdAt);

  wrapper.append(author, time);
  return wrapper;
}

function buildReplyForm(commentId) {
  const form = document.createElement("form");
  form.className = "reply-form";
  form.dataset.commentId = commentId;
  form.hidden = activeReplyCommentId !== commentId;

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Name";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.name = "replyName";
  nameInput.placeholder = "Your name";
  nameInput.required = true;
  nameLabel.appendChild(nameInput);

  const textLabel = document.createElement("label");
  textLabel.textContent = "Reply";

  const textArea = document.createElement("textarea");
  textArea.name = "replyText";
  textArea.rows = 3;
  textArea.placeholder = "Write a reply";
  textArea.required = true;
  textLabel.appendChild(textArea);

  const actions = document.createElement("div");
  actions.className = "reply-form__actions";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "button button--primary reply-form__button";
  submit.textContent = "Reply";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "button button--secondary reply-cancel";
  cancel.textContent = "Cancel";
  cancel.dataset.commentId = commentId;

  actions.append(submit, cancel);
  form.append(nameLabel, textLabel, actions);
  return form;
}

function buildReplyCard(reply) {
  const article = document.createElement("article");
  article.className = "comment-reply";

  const meta = buildCommentMeta(reply.name, reply.createdAt, "comment-reply__top");
  const text = document.createElement("p");
  text.textContent = reply.text;

  article.append(meta, text);
  return article;
}

function buildCommentCard(comment) {
  const article = document.createElement("article");
  article.className = "comment-card";
  article.dataset.commentId = comment.id;

  const meta = buildCommentMeta(comment.name, comment.createdAt, "comment-card__top");
  const text = document.createElement("p");
  text.className = "comment-card__text";
  text.textContent = comment.text;

  const actions = document.createElement("div");
  actions.className = "comment-card__actions";

  const replyButton = document.createElement("button");
  replyButton.type = "button";
  replyButton.className = "button button--secondary comment-reply-toggle";
  replyButton.dataset.commentId = comment.id;
  replyButton.textContent = activeReplyCommentId === comment.id ? "Hide reply" : "Reply";
  actions.appendChild(replyButton);

  const replies = document.createElement("div");
  replies.className = "comment-replies";

  comment.replies.forEach((reply) => {
    replies.appendChild(buildReplyCard(reply));
  });

  article.append(meta, text, actions);

  if (comment.replies.length) {
    article.appendChild(replies);
  }

  article.appendChild(buildReplyForm(comment.id));
  return article;
}

function renderComments() {
  commentList.innerHTML = "";

  if (!comments.length) {
    commentList.appendChild(commentEmpty);
    return;
  }

  comments
    .slice()
    .reverse()
    .forEach((comment) => {
      commentList.appendChild(buildCommentCard(comment));
    });
}

function renderCalendar(month, year) {
  calendarGrid.innerHTML = "";
  monthLabel.textContent = `${monthNames[month]} ${year}`;

  weekdayNames.forEach((day) => {
    const header = document.createElement("div");
    header.className = "calendar-grid__weekday";
    header.textContent = day;
    calendarGrid.appendChild(header);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day is-muted";
    dayCell.innerHTML = `<span class="calendar-day__number">${daysInPrevMonth - i}</span>`;
    calendarGrid.appendChild(dayCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const event = eventMap[dateKey];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";

    if (dateKey === selectedDate) {
      button.classList.add("is-selected");
    }

    button.innerHTML = `
      <span class="calendar-day__number">${day}</span>
      ${event ? `<span class="calendar-day__label">${event.title}</span>` : `<span class="calendar-day__label">Add event</span>`}
    `;

    button.addEventListener("click", () => {
      selectedDate = dateKey;
      updateEventDetail(dateKey);
      renderCalendar(currentMonth, currentYear);
    });

    calendarGrid.appendChild(button);
  }

  const totalCells = firstDay + daysInMonth;
  const trailingDays = (7 - (totalCells % 7)) % 7;
  for (let day = 1; day <= trailingDays; day++) {
    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day is-muted";
    dayCell.innerHTML = `<span class="calendar-day__number">${day}</span>`;
    calendarGrid.appendChild(dayCell);
  }
}

prevMonth.addEventListener("click", () => {
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar(currentMonth, currentYear);
  const firstOfMonth = formatDateKey(currentYear, currentMonth, 1);
  selectedDate = selectedDate.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`) ? selectedDate : firstOfMonth;
  updateEventDetail(selectedDate);
});

nextMonth.addEventListener("click", () => {
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar(currentMonth, currentYear);
  const firstOfMonth = formatDateKey(currentYear, currentMonth, 1);
  selectedDate = selectedDate.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`) ? selectedDate : firstOfMonth;
  updateEventDetail(selectedDate);
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  eventMap[selectedDate] = {
    title: eventTitle.value.trim(),
    time: eventTime.value.trim(),
    location: eventLocation.value.trim(),
    description: eventDescription.value.trim()
  };

  if (!eventMap[selectedDate].title) {
    delete eventMap[selectedDate];
  }

  saveEvents();
  renderCalendar(currentMonth, currentYear);
  updateEventDetail(selectedDate);
  clearEventForm();
});

deleteEvent.addEventListener("click", () => {
  delete eventMap[selectedDate];
  saveEvents();
  renderCalendar(currentMonth, currentYear);
  updateEventDetail(selectedDate);
  clearEventForm();
});

commentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  comments.push({
    id: createId("comment"),
    name: commentName.value.trim(),
    text: commentText.value.trim(),
    createdAt: new Date().toISOString(),
    replies: []
  });

  comments = comments.filter((comment) => comment.name && comment.text);
  saveComments();
  renderComments();
  commentForm.reset();
});

commentList.addEventListener("click", (event) => {
  const replyToggle = event.target.closest(".comment-reply-toggle");
  if (replyToggle) {
    const { commentId } = replyToggle.dataset;
    activeReplyCommentId = activeReplyCommentId === commentId ? null : commentId;
    renderComments();
    return;
  }

  const replyCancel = event.target.closest(".reply-cancel");
  if (replyCancel) {
    activeReplyCommentId = null;
    renderComments();
  }
});

commentList.addEventListener("submit", (event) => {
  const replyForm = event.target.closest(".reply-form");
  if (!replyForm) {
    return;
  }

  event.preventDefault();

  const nameInput = replyForm.querySelector('[name="replyName"]');
  const textInput = replyForm.querySelector('[name="replyText"]');
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  const { commentId } = replyForm.dataset;

  if (!name || !text) {
    return;
  }

  comments = comments.map((comment) => {
    if (comment.id !== commentId) {
      return comment;
    }

    return {
      ...comment,
      replies: [
        ...comment.replies,
        {
          id: createId("reply"),
          name,
          text,
          createdAt: new Date().toISOString()
        }
      ]
    };
  });

  activeReplyCommentId = null;
  saveComments();
  renderComments();
});

renderCalendar(currentMonth, currentYear);
updateEventDetail(selectedDate);
clearEventForm();
renderComments();
