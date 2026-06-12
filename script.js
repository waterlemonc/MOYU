const jokes = [
  {
    text: "今日最稳定的产出，不是方案，也不是文档，而是那句“我先看看”。",
    source: "摸鱼办即时快讯",
  },
  {
    text: "有些人表面在切需求，实际上是在把周末计划切成了分镜头脚本。",
    source: "工位文学周刊",
  },
  {
    text: "打开十个标签页不叫分心，叫给灵感预留多个降落跑道。",
    source: "多窗口行为研究所",
  },
  {
    text: "今天的工作节奏是先进入状态，再进入午休，最后再重新理解状态。",
    source: "摸鱼排班系统",
  },
  {
    text: "当你认真敲键盘的时候，别人不一定知道你在写代码，也可能是在写奶茶备注。",
    source: "办公室观察样本",
  },
];

const statusList = [
  "工位在线，灵魂稍后到达",
  "会议很多，心态更松",
  "今日适合低调浏览创意页面",
  "任务存在，但快乐优先",
  "表面推进需求，实际滋养灵感",
];

const dayTips = [
  "适合把难题留给下午的自己",
  "先打开文档，再打开零食",
  "别急，灵感通常在第二杯水之后出现",
  "可适量整理桌面，营造已开工氛围",
  "会议前先练习一个认真点头的表情",
  "周末将至，今天宜轻盈推进",
  "保留一点神秘感，不必秒回每条消息",
];

const jokeText = document.getElementById("joke-text");
const jokeSource = document.getElementById("joke-source");
const refreshJokeButton = document.getElementById("refresh-joke");
const moyuStatus = document.getElementById("moyu-status");
const moyuScore = document.getElementById("moyu-score");
const todayLabel = document.getElementById("today-label");
const todayTip = document.getElementById("today-tip");
const calendarGrid = document.getElementById("calendar-grid");
const calendarMonthLabel = document.getElementById("calendar-month-label");

function pad2(value) {
  return String(value).padStart(2, "0");
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const weekDay = now.getDay();
  const mondayBased = weekDay === 0 ? 6 : weekDay - 1;
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  calendarGrid.innerHTML = "";
  calendarMonthLabel.textContent = `${year}.${pad2(month + 1)} 摸鱼排班`;
  todayLabel.textContent = `${year}-${pad2(month + 1)}-${pad2(today)}`;
  todayTip.textContent = dayTips[mondayBased];

  for (let index = 0; index < totalCells; index += 1) {
    const day = index - firstWeekday + 1;
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    if (day < 1 || day > daysInMonth) {
      cell.classList.add("is-off");
      cell.innerHTML = "<strong> </strong><span>留白</span>";
    } else {
      const mood = index % 3 === 0 ? "巡航" : index % 3 === 1 ? "潜行" : "发呆";
      cell.innerHTML = `<strong>${day}</strong><span>${mood}</span>`;

      if (day === today) {
        cell.classList.add("is-today");
      }
    }

    calendarGrid.appendChild(cell);
  }
}

function renderJoke(index) {
  const joke = jokes[index];
  jokeText.textContent = joke.text;
  jokeSource.textContent = joke.source;
}

function setupJokes() {
  let currentIndex = new Date().getDate() % jokes.length;
  renderJoke(currentIndex);

  refreshJokeButton.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % jokes.length;
    renderJoke(currentIndex);
  });
}

function setupStatus() {
  const now = new Date();
  const statusIndex = now.getDay() % statusList.length;
  const score = 70 + ((now.getDate() * 3) % 27);

  moyuStatus.textContent = statusList[statusIndex];
  moyuScore.textContent = `${score}%`;
}

renderCalendar();
setupJokes();
setupStatus();
