const DEFAULT_SUBJECTS = [
  { id: "physics", title: "大学物理", deadline: "2026-06-06", tasks: ["电磁学练习 1", "电磁学知识 2", "电磁学练习 2", "质点力学", "刚体力学", "振动与波动", "热学"] },
  { id: "math", title: "高等数学", deadline: "2026-06-06", tasks: ["积分章末题", "积分作业题", "级数作业题 6 页", "级数网课 2 节", "级数笔记 3 节"] },
  { id: "circuit", title: "电路理论", deadline: "2026-06-07", tasks: ["第 11 章习题", "第 12 章习题", "第 10 章习题复盘"] },
  { id: "english", title: "英语四级", deadline: "2026-06-07", tasks: ["四级练习 1", "四级练习 2", "四级练习 3"] },
];

const DAILY_LETTERS = [
  "今天不用证明什么。先安静地完成手边的一小步，节奏会慢慢回到你身上。",
  "不需要等到状态完美才开始。愿意坐下来做十分钟，已经是在照顾未来的自己。",
  "有些日子走得慢一点也没关系。重要的是，你没有把自己留在原地。",
  "别急着一次解决所有事情。今天认真完成一件小事，就值得在晚上安心地夸夸自己。",
  "你不是因为做得足够多才值得休息。选好今天最重要的三件事，做完就给自己一点松弛。",
  "学习不是和谁比赛。把注意力收回来，放在眼前这一页，你就在变得更笃定。",
  "允许今天只是普通的一天。普通地开始，普通地坚持，也会悄悄积累出很好的答案。",
];

const PALETTES = [
  { name: "Column A", note: "水光流体", accent: "#68a8c6", bg: "#edf8fb", ink: "#234554", wash: "#c6edf4", mode: "water", art: "./assets/themes/water-light.png" },
  { name: "Realtime", note: "3D 方块", accent: "#e1b8bc", bg: "#10100f", ink: "#f4eeee", wash: "#574244", mode: "cubes", art: "" },
  { name: "Feed Forward", note: "手绘海报", accent: "#d8d646", bg: "#f3f09a", ink: "#171714", wash: "#e5e36b", mode: "poster", art: "./assets/themes/poster-brush.png" },
  { name: "Kaleido", note: "编辑圆点", accent: "#6672b6", bg: "#f5f5f1", ink: "#202127", wash: "#d9dcf0", mode: "dots", art: "" },
  { name: "Monopo", note: "夜间光谱", accent: "#ff6138", bg: "#121215", ink: "#f7f6f2", wash: "#3978a2", mode: "spectrum", art: "" },
  { name: "Base", note: "极简网格", accent: "#84959d", bg: "#f2f4f3", ink: "#293136", wash: "#d7dedd", mode: "grid", art: "" },
];

const REWARDS = [
  { text: "你不需要一下子变得很厉害。今天愿意继续，就已经很珍贵。", break: "奖励建议：去喝几口水，再回来。" },
  { text: "刚刚完成的不是一个勾选，而是你对自己许下承诺后给出的回应。", break: "奖励建议：站起来舒展两分钟。" },
  { text: "进度慢一点没有关系。你正在把焦虑变成具体的行动。", break: "奖励建议：听一首喜欢的歌。" },
  { text: "你已经替晚上的自己减轻了一点负担。做得很好。", break: "奖励建议：看看窗外，让眼睛休息一下。" },
  { text: "今天的你没有停留在想一想，而是真的向前走了一步。", break: "奖励建议：安心休息五分钟。" },
];

const KEYS = {
  subjects: "shalys-subjects-v2",
  completed: "shalys-pace-v1",
  daily: "shalys-pace-v2-daily",
  review: "shalys-review-v1",
  streak: "shalys-streak-v1",
  palette: "shalys-palette-v1",
  activity: "shalys-activity-v1",
};
const DEFAULT_DAILY_COUNT = 5;
const state = {
  subjects: JSON.parse(localStorage.getItem(KEYS.subjects) || "null") || structuredClone(DEFAULT_SUBJECTS),
  completed: JSON.parse(localStorage.getItem(KEYS.completed) || "{}"),
  daily: [],
  calendarDate: new Date(),
  dialogMode: null,
  dialogSubjectId: null,
  dialogTaskId: null,
};

const $ = (selector) => document.querySelector(selector);
const subjectList = $("#subjectList");
const dailyList = $("#dailyList");
const editorList = $("#editorList");
const rewardOverlay = $("#rewardOverlay");

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function allTasks() {
  return state.subjects.flatMap((subject) =>
    subject.tasks.map((task, index) => ({
      id: typeof task === "string" ? `${subject.id}-${index}` : task.id,
      title: typeof task === "string" ? task : task.title,
      subjectId: subject.id,
      subjectTitle: subject.title,
      deadline: subject.deadline,
    })),
  );
}

function migrateTasks() {
  state.subjects = state.subjects.map((subject) => ({
    ...subject,
    tasks: subject.tasks.map((task, index) =>
      typeof task === "string" ? { id: `${subject.id}-${index}`, title: task } : task,
    ),
  }));
  saveSubjects();
}

function saveSubjects() {
  localStorage.setItem(KEYS.subjects, JSON.stringify(state.subjects));
}

function saveCompleted() {
  localStorage.setItem(KEYS.completed, JSON.stringify(state.completed));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", weekday: "short" }).format(date);
}

function daysUntil(dateText) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((new Date(`${dateText}T23:59:59`) - today) / 86400000));
}

function autoPlan(limit = Math.max(DEFAULT_DAILY_COUNT, state.daily.length)) {
  const pending = allTasks().filter((task) => !state.completed[task.id]);
  const queues = state.subjects
    .map((subject) => ({
      subject,
      days: Math.max(1, daysUntil(subject.deadline)),
      tasks: pending.filter((task) => task.subjectId === subject.id),
    }))
    .filter((item) => item.tasks.length)
    .sort((a, b) => (a.days - b.days) || (b.tasks.length / b.days - a.tasks.length / a.days));
  const result = [];
  while (result.length < limit && queues.some((queue) => queue.tasks.length)) {
    for (const queue of queues) {
      if (queue.tasks.length && result.length < limit) result.push(queue.tasks.shift().id);
    }
  }
  return result;
}

function loadDailyFocus() {
  const saved = JSON.parse(localStorage.getItem(KEYS.daily) || "{}");
  const validIds = new Set(allTasks().map((task) => task.id));
  state.daily = saved.date === todayKey() ? saved.ids.filter((id) => validIds.has(id) && !state.completed[id]) : [];
  if (!state.daily.length) state.daily = autoPlan();
  saveDailyFocus();
}

function saveDailyFocus() {
  localStorage.setItem(KEYS.daily, JSON.stringify({ date: todayKey(), ids: state.daily }));
}

function completedCount() {
  return allTasks().filter((task) => state.completed[task.id]).length;
}

function activityLog() {
  return JSON.parse(localStorage.getItem(KEYS.activity) || "{}");
}

function recordActivity(taskId, checked) {
  const log = activityLog();
  const day = (log[todayKey()] ||= { completed: [], undone: [] });
  const target = checked ? day.completed : day.undone;
  if (!target.includes(taskId)) target.push(taskId);
  localStorage.setItem(KEYS.activity, JSON.stringify(log));
}

function updateStreak() {
  const streak = JSON.parse(localStorage.getItem(KEYS.streak) || '{"dates":[]}');
  if (completedCount() > 0 && !streak.dates.includes(todayKey())) {
    streak.dates.push(todayKey());
    localStorage.setItem(KEYS.streak, JSON.stringify(streak));
  }
  $("#streakStat").textContent = `${streak.dates.length} DAYS`;
}

function renderSubjects() {
  subjectList.innerHTML = state.subjects.map((subject, index) => {
    const done = subject.tasks.filter((task) => state.completed[task.id]).length;
    const percent = subject.tasks.length ? Math.round((done / subject.tasks.length) * 100) : 0;
    return `
      <article class="subject-card">
        <div class="subject-summary">
          <span class="subject-number">${String(index + 1).padStart(2, "0")}</span>
          <div class="subject-title"><h3>${subject.title}</h3><span>DDL · ${subject.deadline.slice(5).replace("-", ".")}</span></div>
          <div class="subject-progress"><span>${done} / ${subject.tasks.length}</span><div class="mini-track"><i style="width:${percent}%"></i></div></div>
        </div>
        <div class="task-list">
          ${subject.tasks.map((task) => `
            <label class="task-item ${state.completed[task.id] ? "completed" : ""}">
              <input type="checkbox" data-task-id="${task.id}" ${state.completed[task.id] ? "checked" : ""}>
              <span>${task.title}</span><small>${state.completed[task.id] ? "DONE" : "NEXT"}</small>
            </label>`).join("") || '<p class="empty-note">还没有子任务，可以在下方编辑器添加。</p>'}
        </div>
      </article>`;
  }).join("");
}

function renderDaily() {
  const tasks = allTasks();
  state.daily = state.daily.filter((id) => tasks.some((task) => task.id === id));
  const focus = state.daily.map((id) => tasks.find((task) => task.id === id)).filter(Boolean);
  $("#dailyCount").textContent = `${focus.filter((task) => state.completed[task.id]).length} / ${focus.length}`;
  dailyList.innerHTML = state.daily.map((_, index) => {
    const task = focus[index];
    const options = tasks.filter((item) => !state.completed[item.id] || item.id === task?.id);
    return `
      <div class="daily-edit-row">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <select data-daily-slot="${index}">
          <option value="">选择今日任务</option>
          ${options.map((item) => `<option value="${item.id}" ${item.id === task?.id ? "selected" : ""}>${item.subjectTitle} · ${item.title}</option>`).join("")}
        </select>
        <button type="button" data-remove-daily="${index}" aria-label="移除今日任务">×</button>
      </div>`;
  }).join("") || '<p class="muted">今天还没有安排任务。可以点击下方按钮添加，或者让系统自动安排。</p>';
}

function renderStats() {
  const tasks = allTasks();
  const count = completedCount();
  const percent = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
  $("#overallPercent").textContent = `${percent}%`;
  $("#overallCount").textContent = `${count} / ${tasks.length} completed`;
  $("#completedStat").textContent = count;
  $("#orbitProgress").style.strokeDashoffset = 2 * Math.PI * 88 * (1 - percent / 100);
  const nearest = tasks.filter((task) => !state.completed[task.id]).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  $("#nearestDdl").textContent = nearest ? `${daysUntil(nearest.deadline)} DAYS` : "CLEAR";
  $("#nearestDdlLabel").textContent = nearest ? `${nearest.subjectTitle} · ${nearest.deadline.slice(5).replace("-", ".")}` : "本周任务已清空";
  updateStreak();
  renderCountdown(nearest);
}

function renderCountdown(nearest) {
  if (!nearest) {
    $("#countdownDays").textContent = "✓";
    $("#countdownTitle").textContent = "任务已经清空";
    $("#countdownCopy").textContent = "今天可以安心复盘，也别忘了好好休息。";
    $("#countdownProgress").style.width = "100%";
    return;
  }
  const days = daysUntil(nearest.deadline);
  $("#countdownDays").textContent = days;
  $("#countdownTitle").textContent = `${nearest.subjectTitle} · ${nearest.title}`;
  $("#countdownCopy").textContent = days === 0 ? "今天就是 DDL。先完成最关键的一部分。" : `还有 ${days} 天。今天只需要推进计划中的这一小段。`;
  $("#countdownProgress").style.width = `${Math.max(8, Math.min(100, 100 - days * 11))}%`;
}

function renderHeatmap() {
  const log = activityLog();
  const cells = [];
  for (let index = 83; index >= 0; index--) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = date.toLocaleDateString("sv-SE");
    const count = log[key]?.completed?.length || 0;
    cells.push(`<i class="heat-${Math.min(4, count)}" title="${key} · 完成 ${count} 项"></i>`);
  }
  $("#heatmapGrid").innerHTML = cells.join("");
}

function renderWeekly() {
  const log = activityLog();
  let weeklyDone = 0;
  for (let index = 6; index >= 0; index--) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    weeklyDone += log[date.toLocaleDateString("sv-SE")]?.completed?.length || 0;
  }
  const tasks = allTasks();
  const rate = tasks.length ? Math.round((completedCount() / tasks.length) * 100) : 0;
  const pendingSubjects = state.subjects.map((subject) => ({
    title: subject.title,
    count: subject.tasks.filter((task) => !state.completed[task.id]).length,
  })).sort((a, b) => b.count - a.count);
  $("#weeklyCompleted").textContent = weeklyDone;
  $("#weeklyRate").textContent = `${rate}%`;
  $("#weeklyFocus").textContent = pendingSubjects[0]?.count ? pendingSubjects[0].title : "已清空";
  $("#weeklyCopy").textContent = weeklyDone
    ? `这周你已经完成了 ${weeklyDone} 个具体动作。接下来不需要一口气解决全部事情，优先照顾「${pendingSubjects[0]?.title || "复盘"}」就好。`
    : "这一周还没有留下记录。没关系，今天选一件足够小的事开始，让第一格亮起来。";
}

function renderMilestones() {
  const completedSubjects = state.subjects.filter((subject) => subject.tasks.length && subject.tasks.every((task) => state.completed[task.id])).length;
  const steps = [
    { label: "START", unlocked: true },
    { label: "P1", unlocked: completedSubjects >= 1 },
    { label: "P2", unlocked: completedSubjects >= 2 },
    { label: "P3", unlocked: completedSubjects >= 3 },
    { label: "FINISH", unlocked: state.subjects.length > 0 && completedSubjects === state.subjects.length },
  ];
  $("#milestoneTrack").innerHTML = steps.map((step, index) => `
    <div class="${step.unlocked ? "unlocked" : ""}">
      <i>${step.unlocked ? "✓" : index}</i><span>${step.label}</span>
    </div>`).join("");
}

function renderEditor() {
  editorList.innerHTML = state.subjects.map((subject) => `
    <article class="editor-card">
      <header>
        <div><h3>${subject.title}</h3><span>DDL · ${subject.deadline}</span></div>
        <div class="editor-actions">
          <button type="button" data-edit-subject="${subject.id}">编辑</button>
          <button type="button" data-delete-subject="${subject.id}">删除</button>
        </div>
      </header>
      <div class="editor-tasks">
        ${subject.tasks.map((task) => `
          <div><span>${task.title}</span><span>
            <button type="button" data-edit-task="${task.id}" data-subject-id="${subject.id}">修改</button>
            <button type="button" data-delete-task="${task.id}" data-subject-id="${subject.id}">×</button>
          </span></div>`).join("")}
      </div>
      <button class="add-task-line" type="button" data-add-task="${subject.id}">+ 添加子任务</button>
    </article>`).join("");
}

function buildSchedule() {
  const schedule = {};
  const today = new Date(`${todayKey()}T00:00:00`);
  allTasks().filter((task) => !state.completed[task.id]).sort((a, b) => a.deadline.localeCompare(b.deadline)).forEach((task) => {
    const deadline = new Date(`${task.deadline}T00:00:00`);
    const candidates = [];
    for (let date = new Date(today); date <= deadline; date.setDate(date.getDate() + 1)) {
      const key = date.toLocaleDateString("sv-SE");
      candidates.push(key);
    }
    const target = (candidates.length ? candidates : [task.deadline]).sort((a, b) => ((schedule[a]?.length || 0) - (schedule[b]?.length || 0)) || a.localeCompare(b))[0];
    (schedule[target] ||= []).push(task);
  });
  return schedule;
}

function renderCalendar() {
  const date = state.calendarDate;
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  $("#calendarTitle").textContent = `${year}.${String(month + 1).padStart(2, "0")}`;
  const taskByDate = buildSchedule();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push('<div class="calendar-day ghost"></div>');
  for (let day = 1; day <= days; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const tasks = taskByDate[key] || [];
    cells.push(`
      <div class="calendar-day ${key === todayKey() ? "today" : ""} ${tasks.length ? "has-tasks" : ""}">
        <strong>${day}</strong>
        <div>${tasks.slice(0, 3).map((task) => `<span title="${task.title}${task.deadline === key ? " · 今日 DDL" : ""}">${task.subjectTitle} · ${task.title}${task.deadline === key ? " ⏱" : ""}</span>`).join("")}</div>
        ${tasks.length > 3 ? `<small>+${tasks.length - 3} 项</small>` : ""}
      </div>`);
  }
  $("#calendarGrid").innerHTML = cells.join("");
}

function renderAll() {
  renderSubjects();
  renderDaily();
  renderStats();
  renderEditor();
  renderCalendar();
  renderHeatmap();
  renderWeekly();
  renderMilestones();
}

function showReward(title) {
  const reward = REWARDS[Math.floor(Math.random() * REWARDS.length)];
  $("#rewardText").textContent = title ? `「${title}」已记入进度。${reward.text}` : reward.text;
  $("#rewardBreak").textContent = reward.break;
  rewardOverlay.classList.add("show");
  setTimeout(() => rewardOverlay.classList.remove("show"), 1450);
}

function handleTaskToggle(taskId, checked) {
  state.completed[taskId] = checked;
  saveCompleted();
  recordActivity(taskId, checked);
  if (checked) {
    state.daily = state.daily.filter((id) => id !== taskId);
    const next = autoPlan().find((id) => !state.daily.includes(id));
    if (next) state.daily.push(next);
    saveDailyFocus();
    showReward(allTasks().find((task) => task.id === taskId)?.title);
    spawnCompletionParticles();
  }
  renderAll();
}

function exportBackup() {
  const data = { version: 1, exportedAt: new Date().toISOString() };
  Object.values(KEYS).forEach((key) => (data[key] = localStorage.getItem(key)));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `shalys-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      Object.values(KEYS).forEach((key) => {
        if (typeof data[key] === "string") localStorage.setItem(key, data[key]);
      });
      alert("备份已恢复，页面将刷新。");
      location.reload();
    } catch {
      alert("这个备份文件无法识别，请重新选择。");
    }
  };
  reader.readAsText(file);
}

function setPalette(accent, bg = "#eef8fd", ink = "#29445a", wash = "#dceef9", mode = "water", art = "") {
  const root = document.documentElement;
  root.style.setProperty("--blue", accent);
  root.style.setProperty("--electric", accent);
  root.style.setProperty("--bg", bg);
  root.style.setProperty("--text", ink);
  root.style.setProperty("--ice", ink);
  root.style.setProperty("--wash", wash);
  root.style.setProperty("--theme-art", art ? `url("${art}")` : "none");
  root.dataset.theme = mode;
  $("#themeWord").textContent = mode === "poster" ? "MOVE" : mode === "cubes" ? "REALTIME" : mode === "water" ? "COLUMN A" : mode.toUpperCase();
  localStorage.setItem(KEYS.palette, JSON.stringify({ accent, bg, ink, wash, mode, art }));
}

function renderPalette() {
  $("#paletteGrid").innerHTML = PALETTES.map((palette) => `
    <button type="button" data-accent="${palette.accent}" data-bg="${palette.bg}" data-ink="${palette.ink}" data-wash="${palette.wash}" data-mode="${palette.mode}" data-art="${palette.art}" style="--swatch:${palette.accent};--preview:${palette.wash};--theme-preview:${palette.art ? `url('${palette.art}')` : "none"}">
      <i></i><span><b>${palette.name}</b><small>${palette.note}</small></span>
    </button>`).join("");
  const saved = JSON.parse(localStorage.getItem(KEYS.palette) || "null");
  if (saved) setPalette(saved.accent, saved.bg, saved.ink, saved.wash, saved.mode, saved.art);
  $("#paletteWelcome").classList.add("show");
  $("#paletteWelcome").setAttribute("aria-hidden", "false");
}

function closePalette() {
  $("#paletteWelcome").classList.remove("show");
  $("#paletteWelcome").setAttribute("aria-hidden", "true");
}

function openDialog(mode, subjectId = null, taskId = null) {
  state.dialogMode = mode;
  state.dialogSubjectId = subjectId;
  state.dialogTaskId = taskId;
  const subject = state.subjects.find((item) => item.id === subjectId);
  const task = subject?.tasks.find((item) => item.id === taskId);
  $("#taskDialogTitle").textContent = mode === "addSubject" ? "新增科目" : mode === "editSubject" ? "编辑科目" : mode === "addTask" ? "添加子任务" : "修改子任务";
  $("#subjectNameInput").value = subject?.title || "";
  $("#deadlineInput").value = subject?.deadline || new Date().toLocaleDateString("sv-SE");
  $("#taskNameInput").value = task?.title || "";
  $("#taskNameLabel").hidden = mode === "addSubject" || mode === "editSubject";
  $("#subjectNameInput").readOnly = mode === "addTask" || mode === "editTask";
  $("#deadlineInput").disabled = mode === "addTask" || mode === "editTask";
  $("#taskDialog").showModal();
}

function saveDialog(event) {
  event.preventDefault();
  const subjectName = $("#subjectNameInput").value.trim();
  const taskName = $("#taskNameInput").value.trim();
  const deadline = $("#deadlineInput").value;
  if (state.dialogMode === "addSubject") state.subjects.push({ id: uid("subject"), title: subjectName, deadline, tasks: [] });
  if (state.dialogMode === "editSubject") Object.assign(state.subjects.find((item) => item.id === state.dialogSubjectId), { title: subjectName, deadline });
  if (state.dialogMode === "addTask" && taskName) state.subjects.find((item) => item.id === state.dialogSubjectId).tasks.push({ id: uid("task"), title: taskName });
  if (state.dialogMode === "editTask" && taskName) state.subjects.find((item) => item.id === state.dialogSubjectId).tasks.find((item) => item.id === state.dialogTaskId).title = taskName;
  saveSubjects();
  state.daily = autoPlan();
  saveDailyFocus();
  $("#taskDialog").close();
  renderAll();
}

subjectList.addEventListener("change", (event) => {
  if (event.target.matches("[data-task-id]")) handleTaskToggle(event.target.dataset.taskId, event.target.checked);
});
dailyList.addEventListener("change", (event) => {
  if (!event.target.matches("[data-daily-slot]")) return;
  state.daily[Number(event.target.dataset.dailySlot)] = event.target.value;
  state.daily = [...new Set(state.daily.filter(Boolean))];
  saveDailyFocus();
  renderDaily();
});
dailyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-daily]");
  if (!button) return;
  state.daily.splice(Number(button.dataset.removeDaily), 1);
  saveDailyFocus();
  renderDaily();
});
editorList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.addTask) openDialog("addTask", button.dataset.addTask);
  if (button.dataset.editSubject) openDialog("editSubject", button.dataset.editSubject);
  if (button.dataset.editTask) openDialog("editTask", button.dataset.subjectId, button.dataset.editTask);
  if (button.dataset.deleteTask && confirm("确定删除这个子任务吗？")) {
    const subject = state.subjects.find((item) => item.id === button.dataset.subjectId);
    subject.tasks = subject.tasks.filter((item) => item.id !== button.dataset.deleteTask);
    saveSubjects(); renderAll();
  }
  if (button.dataset.deleteSubject && confirm("确定删除整个科目及其任务吗？")) {
    state.subjects = state.subjects.filter((item) => item.id !== button.dataset.deleteSubject);
    saveSubjects(); renderAll();
  }
});
$("#paletteGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-accent]");
  if (button) { setPalette(button.dataset.accent, button.dataset.bg, button.dataset.ink, button.dataset.wash, button.dataset.mode, button.dataset.art); closePalette(); }
});
$("#customColor").addEventListener("input", (event) => setPalette(event.target.value));
$("#randomThemeButton").addEventListener("click", () => {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  setPalette(palette.accent, palette.bg, palette.ink, palette.wash, palette.mode, palette.art);
  closePalette();
});
$("#closePaletteButton").addEventListener("click", closePalette);
$("#addSubjectButton").addEventListener("click", () => openDialog("addSubject"));
$("#taskDialogForm").addEventListener("submit", saveDialog);
$("#cancelDialogButton").addEventListener("click", () => $("#taskDialog").close());
$("#addDailyButton").addEventListener("click", () => {
  const next = autoPlan(allTasks().length).find((id) => !state.daily.includes(id));
  if (next) state.daily.push(next);
  saveDailyFocus();
  renderDaily();
});
$("#refreshFocusButton").addEventListener("click", () => { state.daily = autoPlan(); saveDailyFocus(); renderDaily(); });
$("#focusButton").addEventListener("click", () => $("#dailyCardMobile").scrollIntoView({ behavior: "smooth" }));
$("#prevMonthButton").addEventListener("click", () => { state.calendarDate.setMonth(state.calendarDate.getMonth() - 1); renderCalendar(); });
$("#nextMonthButton").addEventListener("click", () => { state.calendarDate.setMonth(state.calendarDate.getMonth() + 1); renderCalendar(); });
$("#exportButton").addEventListener("click", exportBackup);
$("#importInput").addEventListener("change", importBackup);
$("#playgroundCanvas").addEventListener("pointerdown", spawnPlayMark);
rewardOverlay.addEventListener("click", () => rewardOverlay.classList.remove("show"));
$("#resetButton").addEventListener("click", () => {
  if (confirm("确定清空本机保存的任务进度和复盘记录吗？")) {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    location.reload();
  }
});
$("#reviewForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const reviews = JSON.parse(localStorage.getItem(KEYS.review) || "{}");
  reviews[todayKey()] = { done: $("#reviewDone").value.trim(), blocked: $("#reviewBlocked").value.trim(), next: $("#reviewNext").value.trim(), savedAt: new Date().toISOString() };
  localStorage.setItem(KEYS.review, JSON.stringify(reviews));
  $("#saveHint").textContent = "今日复盘已保存。明天继续。";
  setTimeout(() => ($("#saveHint").textContent = ""), 2400);
});

function loadReview() {
  const review = JSON.parse(localStorage.getItem(KEYS.review) || "{}")[todayKey()] || {};
  $("#reviewDone").value = review.done || "";
  $("#reviewBlocked").value = review.blocked || "";
  $("#reviewNext").value = review.next || "";
}

function initMotion() {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  if (!matchMedia("(pointer:fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const glow = $("#cursorGlow");
  const field = document.querySelector(".kinetic-field");
  window.addEventListener("pointermove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
    glow.style.opacity = "1";
    if (field) {
      const x = (event.clientX / innerWidth - 0.5) * 12;
      const y = (event.clientY / innerHeight - 0.5) * 12;
      field.style.translate = `${x}px ${y}px`;
    }
  });
  document.addEventListener("mouseleave", () => (glow.style.opacity = "0"));
}

function currentTheme() {
  return document.documentElement.dataset.theme || "water";
}

function spawnPlayMark(event) {
  const canvas = $("#playgroundCanvas");
  const rect = canvas.getBoundingClientRect();
  const mark = document.createElement("i");
  mark.className = "play-mark";
  mark.style.left = `${event.clientX - rect.left}px`;
  mark.style.top = `${event.clientY - rect.top}px`;
  if (currentTheme() === "poster") {
    mark.style.borderRadius = "0";
    mark.style.rotate = `${Math.random() * 40 - 20}deg`;
    mark.style.background = "#171714";
  }
  if (currentTheme() === "cubes") {
    mark.style.borderRadius = "5px";
    mark.style.background = "#e1b8bc";
  }
  if (currentTheme() === "spectrum") mark.style.background = Math.random() > 0.5 ? "#ff6234" : "#81b5cc";
  canvas.append(mark);
  setTimeout(() => mark.remove(), 1800);
}

function spawnCompletionParticles() {
  const layer = $("#interactionLayer");
  for (let index = 0; index < 14; index++) {
    const particle = document.createElement("i");
    particle.className = "completion-particle";
    particle.style.left = `${42 + Math.random() * 18}%`;
    particle.style.top = `${42 + Math.random() * 18}%`;
    particle.style.setProperty("--dx", `${Math.random() * 210 - 105}px`);
    particle.style.setProperty("--dy", `${Math.random() * 190 - 95}px`);
    if (currentTheme() === "poster") {
      particle.style.borderRadius = "0";
      particle.style.background = "#171714";
    }
    if (currentTheme() === "cubes") particle.style.borderRadius = "3px";
    layer.append(particle);
    setTimeout(() => particle.remove(), 1200);
  }
}

migrateTasks();
loadDailyFocus();
loadReview();
$("#todayDate").textContent = formatDate(new Date());
$("#dailyLetter").textContent = DAILY_LETTERS[new Date().getDate() % DAILY_LETTERS.length];
renderPalette();
renderAll();
initMotion();
