import React, { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  Menu, X, Plus, ChevronRight, ChevronDown, Sparkles, CalendarDays,
  CheckSquare, ShoppingCart, MapPin, ArrowLeft, Archive, ArchiveRestore,
  Users, Package, Ticket, ExternalLink, Check, Calendar
} from "lucide-react";

/* ---------------------------------------------------------
   Firebaseの設定
   ここに、Firebaseコンソールでコピーした「firebaseConfig」の中身を
   そのまま貼り付けてください(下の6行を、あなたの値に置き換えます)。
--------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyBANVa0m0KS0ELeWEnGGnLx6t-fTz-gVrQ",
  authDomain: "travel-plans-6f3a6.firebaseapp.com",
  projectId: "travel-plans-6f3a6",
  storageBucket: "travel-plans-6f3a6.firebasestorage.app",
  messagingSenderId: "557134790077",
  appId: "1:557134790077:web:528262dfae0e42d98226d4"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

/* ---------------------------------------------------------
   定数
--------------------------------------------------------- */
const CATEGORY_META = {
  "飛行機": { emoji: "✈️", bg: "#FFE3DC", text: "#C25B3E", dot: "#FFB4A2" },
  "電車": { emoji: "🚅", bg: "#FFEAE3", text: "#C97452", dot: "#FFC3AE" },
  "バス": { emoji: "🚌", bg: "#FFEFE9", text: "#D18563", dot: "#FFD2BE" },
  "タクシー": { emoji: "🚕", bg: "#FFF2EE", text: "#D89473", dot: "#FFDDCB" },
  "宿泊": { emoji: "🏨", bg: "#EDE6F9", text: "#6A4FA0", dot: "#B8A6E0" },
  "食事": { emoji: "🍽️", bg: "#FFF3D6", text: "#B8862E", dot: "#FFD97D" },
  "カフェ": { emoji: "☕️", bg: "#F5E9D6", text: "#8C6A3E", dot: "#D9BB8C" },
  "飲み会": { emoji: "🍻", bg: "#FFE9B8", text: "#A67C22", dot: "#FFCB61" },
  "観光": { emoji: "🎪", bg: "#E1F5EC", text: "#3F8F6C", dot: "#7FC8A9" },
  "その他": { emoji: "🩵", bg: "#E6F4FB", text: "#2E7AA6", dot: "#9FD7EE" },
};
const CATEGORY_LIST = ["飛行機", "電車", "バス", "タクシー", "宿泊", "食事", "カフェ", "飲み会", "観光", "その他"];
const EMOJI_OPTIONS = ["✈️", "🏖️", "⛰️", "🗼", "🚗", "🚄", "🏯", "🎡", "🍜", "🏕️", "🛳️", "🌸"];
const RESERVATION_CATEGORIES = ["フライト", "ホテル", "レンタカー", "その他"];

/* ---------------------------------------------------------
   日付ユーティリティ
--------------------------------------------------------- */
function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function parseYMD(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function todayYMD() {
  return toYMD(new Date());
}
function diffDaysFromToday(ymd) {
  const a = parseYMD(todayYMD());
  const b = parseYMD(ymd);
  return Math.round((b - a) / 86400000);
}
function formatRange(start, end) {
  const s = parseYMD(start), e = parseYMD(end);
  const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(s)} 〜 ${fmt(e)}`;
}
function listDaysInRange(start, end) {
  const days = [];
  let cur = parseYMD(start);
  const last = parseYMD(end);
  while (cur <= last) {
    days.push(toYMD(cur));
    cur = addDays(cur, 1);
  }
  return days;
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function openMap(place) {
  if (!place) return;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`, "_blank");
}

/* ---------------------------------------------------------
   小さなUIパーツ
--------------------------------------------------------- */
function InputField(props) {
  return <input {...props} className={"ts-input " + (props.className || "")} />;
}
function TextareaField(props) {
  return <textarea {...props} className={"ts-input " + (props.className || "")} />;
}
function SelectField(props) {
  return <select {...props} className={"ts-input " + (props.className || "")} />;
}

function CheckCircle({ checked, onClick }) {
  return (
    <button className={"ts-checkcircle" + (checked ? " checked" : "")} onClick={onClick} aria-label="チェック">
      {checked && <Check size={14} strokeWidth={3} color="#fff" />}
    </button>
  );
}

function ChecklistTab({ items, onAdd, onToggle, onDelete, placeholder }) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <div className="ts-checklist-tab">
      <div className="ts-add-row">
        <InputField
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="ts-small-add-btn" onClick={submit}><Plus size={16} /> 追加</button>
      </div>
      <div className="ts-checklist-items">
        {items.length === 0 && <p className="ts-empty-text">まだ何も登録されていません</p>}
        {items.map((it) => (
          <div className="ts-checklist-row" key={it.id}>
            <CheckCircle checked={it.checked} onClick={() => onToggle(it.id)} />
            <span className={it.checked ? "ts-checked-text" : ""}>{it.text}</span>
            <button className="ts-delete-link" onClick={() => onDelete(it.id)}>削除する</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ホーム画面
--------------------------------------------------------- */
function CountdownCard({ trip, onOpen }) {
  const diff = diffDaysFromToday(trip.startDate);
  const endDiff = diffDaysFromToday(trip.endDate);
  let label;
  if (diff > 0) label = `あと${diff}日`;
  else if (diff === 0) label = "今日から出発!";
  else if (endDiff >= 0) label = "旅行中!";
  else label = "";

  return (
    <div className="ts-countdown-card">
      <div className="ts-countdown-decoration" />
      <div className="ts-countdown-emoji">{trip.emoji}</div>
      <div className="ts-countdown-label">{label}</div>
      <div className="ts-countdown-name">{trip.name}</div>
      <div className="ts-countdown-dest"><MapPin size={12} /> {trip.destination}</div>
      <div className="ts-countdown-range">{formatRange(trip.startDate, trip.endDate)}</div>
      <button className="ts-open-btn" onClick={onOpen}>このしおりを開く</button>
    </div>
  );
}

function HomeEmpty({ onAddTrip }) {
  return (
    <div className="ts-home-empty">
      <Sparkles size={34} color="#3FA9E0" />
      <div className="ts-home-empty-title">次の旅行を計画しよう</div>
      <p className="ts-home-empty-sub">まだ予定中の旅行がありません</p>
      <button className="ts-primary-btn" onClick={onAddTrip}>旅行を追加する</button>
    </div>
  );
}

function ScheduleMiniCard({ item }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META["その他"];
  return (
    <div className="ts-mini-schedule-card" onClick={() => openMap(item.location || item.arrivalLocation)}>
      <span className="ts-cat-badge ts-cat-badge-emoji ts-cat-badge-emoji-sm" style={{ background: meta.bg }}>{meta.emoji}</span>
      <span className="ts-mini-time">{item.time}</span>
      {item.endTime && <span className="ts-mini-endtime">→ {item.endTime}</span>}
      <div className="ts-mini-body">
        <div className="ts-mini-title">{item.title}</div>
        {(item.location || item.arrivalLocation) && (
          <div className="ts-mini-loc"><MapPin size={11} /> {item.location || item.arrivalLocation}</div>
        )}
      </div>
    </div>
  );
}

function HomeScreen({ trips, onOpenTrip, onOpenDrawer, onAddTrip }) {
  const upcoming = useMemo(() => {
    return trips
      .filter((t) => !t.archived && t.endDate >= todayYMD())
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0];
  }, [trips]);

  const isDuring = upcoming && todayYMD() >= upcoming.startDate && todayYMD() <= upcoming.endDate;
  const scheduleDay = upcoming ? (isDuring ? todayYMD() : upcoming.startDate) : null;
  const scheduleItems = upcoming ? (upcoming.days[scheduleDay] || []) : [];

  let phase = "pre";
  if (upcoming) {
    if (isDuring) phase = "during";
    else if (todayYMD() > upcoming.endDate) phase = "post";
  }
  const todoItems = upcoming ? upcoming.todos[phase].filter((t) => !t.checked) : [];
  const shoppingItems = upcoming ? upcoming.shoppingList.filter((s) => !s.checked) : [];

  return (
    <div className="ts-screen">
      <div className="ts-topbar">
        <button className="ts-icon-btn" onClick={onOpenDrawer}><Menu size={22} color="#33566E" /></button>
        <div className="ts-topbar-title">🌴 旅のしおり</div>
        <div style={{ width: 22 }} />
      </div>

      <div className="ts-content">
        {upcoming ? <CountdownCard trip={upcoming} onOpen={() => onOpenTrip(upcoming.id)} /> : <HomeEmpty onAddTrip={onAddTrip} />}

        {upcoming && (
          <>
            <div className="ts-section-head"><CalendarDays size={17} color="#FFB6B9" /><span>{isDuring ? "今日の予定" : "初日の予定"}</span></div>
            {scheduleItems.length === 0 ? (
              <div className="ts-empty-block"><Calendar size={26} color="#BFC9D2" /><p>予定はまだありません</p></div>
            ) : (
              <div className="ts-mini-list">{scheduleItems.map((it) => <ScheduleMiniCard key={it.id} item={it} />)}</div>
            )}

            <div className="ts-section-head"><CheckSquare size={17} color="#FFB6B9" /><span>やることリスト({phase === "pre" ? "旅行前" : phase === "during" ? "旅行中" : "旅行後"})</span></div>
            {todoItems.length === 0 ? (
              <p className="ts-empty-text">未完了のタスクはありません</p>
            ) : (
              <div className="ts-simple-list">{todoItems.map((t) => <div key={t.id} className="ts-simple-row"><span className="ts-cat-dot" style={{ background: "#FFD5D7" }} />{t.text}</div>)}</div>
            )}

            <div className="ts-section-head"><ShoppingCart size={17} color="#FFB6B9" /><span>買うものリスト</span></div>
            {shoppingItems.length === 0 ? (
              <p className="ts-empty-text">買い忘れはなさそうです</p>
            ) : (
              <div className="ts-simple-list">{shoppingItems.map((s) => <div key={s.id} className="ts-simple-row"><span className="ts-cat-dot" style={{ background: "#FFD5D7" }} />{s.text}</div>)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   旅行追加フォーム(下からせり上がるパネル)
--------------------------------------------------------- */
function AddTripSheet({ onClose, onCreate }) {
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [members, setMembers] = useState([]);
  const [memberInput, setMemberInput] = useState("");

  const canSubmit = name && destination && startDate && endDate && endDate >= startDate;

  const addMember = () => {
    if (!memberInput.trim()) return;
    setMembers([...members, memberInput.trim()]);
    setMemberInput("");
  };

  const submit = () => {
    if (!canSubmit) return;
    const days = listDaysInRange(startDate, endDate);
    onCreate({
      id: uid(),
      emoji, name, destination, startDate, endDate, members,
      archived: false,
      days: Object.fromEntries(days.map((d) => [d, []])),
      packingList: [], shoppingList: [],
      todos: { pre: [], during: [], post: [] },
      reservations: [],
    });
  };

  return (
    <div className="ts-sheet-overlay" onClick={onClose}>
      <div className="ts-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ts-sheet-handle" />
        <h3 className="ts-sheet-title">旅行を追加</h3>

        <div className="ts-emoji-picker">
          {EMOJI_OPTIONS.map((em) => (
            <button key={em} className={"ts-emoji-btn" + (emoji === em ? " selected" : "")} onClick={() => setEmoji(em)}>{em}</button>
          ))}
        </div>

        <InputField placeholder="旅行名(例:東京家族旅行)" value={name} onChange={(e) => setName(e.target.value)} />
        <InputField placeholder="行き先(例:東京)" value={destination} onChange={(e) => setDestination(e.target.value)} />

        <div className="ts-grid-2">
          <InputField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <InputField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="ts-add-row">
          <InputField placeholder="参加メンバーの名前" value={memberInput} onChange={(e) => setMemberInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} />
          <button className="ts-small-add-btn" onClick={addMember}><Plus size={16} /> 追加</button>
        </div>
        <div className="ts-chip-row">
          {members.map((m, i) => (
            <span className="ts-chip" key={i}>{m}<button onClick={() => setMembers(members.filter((_, idx) => idx !== i))}>×</button></span>
          ))}
        </div>

        <button className="ts-primary-btn" style={{ opacity: canSubmit ? 1 : 0.4, pointerEvents: canSubmit ? "auto" : "none" }} onClick={submit}>
          この内容で作成
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   旅行一覧ドロワー
--------------------------------------------------------- */
function TripListItem({ trip, onOpen, onToggleArchive }) {
  return (
    <div className="ts-trip-card">
      <div className="ts-trip-card-main" onClick={() => onOpen(trip.id)}>
        <div className="ts-trip-emoji">{trip.emoji}</div>
        <div className="ts-trip-info">
          <div className="ts-trip-name">{trip.name}</div>
          <div className="ts-trip-dest"><MapPin size={11} /> {trip.destination}</div>
          <div className="ts-trip-range">{formatRange(trip.startDate, trip.endDate)}</div>
        </div>
      </div>
      <button className="ts-icon-btn-soft" onClick={() => onToggleArchive(trip.id)}>
        {trip.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
      </button>
      <ChevronRight size={18} color="#BFC9D2" onClick={() => onOpen(trip.id)} style={{ cursor: "pointer" }} />
    </div>
  );
}

function TripDrawer({ trips, onClose, onOpen, onToggleArchive, onAddTrip, showAddSheet, setShowAddSheet, onCreateTrip }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const upcoming = trips.filter((t) => !t.archived && t.endDate >= todayYMD()).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const ended = trips.filter((t) => !t.archived && t.endDate < todayYMD()).sort((a, b) => (a.endDate > b.endDate ? -1 : 1));
  const archived = trips.filter((t) => t.archived);

  return (
    <div className="ts-drawer-overlay" onClick={onClose}>
      <div className="ts-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ts-drawer-top">
          <h3>旅行一覧</h3>
          <button className="ts-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <button className="ts-primary-btn" onClick={() => setShowAddSheet(true)}><Plus size={16} /> 旅行を追加</button>

        <h4 className="ts-drawer-subhead">予定中</h4>
        {upcoming.length === 0 && <p className="ts-empty-text">予定中の旅行はありません</p>}
        {upcoming.map((t) => <TripListItem key={t.id} trip={t} onOpen={onOpen} onToggleArchive={onToggleArchive} />)}

        <h4 className="ts-drawer-subhead">終わった旅行</h4>
        {ended.length === 0 && <p className="ts-empty-text">終わった旅行はありません</p>}
        {ended.map((t) => <TripListItem key={t.id} trip={t} onOpen={onOpen} onToggleArchive={onToggleArchive} />)}

        <button className="ts-archive-toggle" onClick={() => setArchiveOpen(!archiveOpen)}>
          {archiveOpen ? "アーカイブ済みを隠す" : `アーカイブ済みを見る(${archived.length})`}
        </button>
        {archiveOpen && archived.map((t) => <TripListItem key={t.id} trip={t} onOpen={onOpen} onToggleArchive={onToggleArchive} />)}
      </div>

      {showAddSheet && <AddTripSheet onClose={() => setShowAddSheet(false)} onCreate={(t) => { onCreateTrip(t); setShowAddSheet(false); }} />}
    </div>
  );
}

/* ---------------------------------------------------------
   予定追加フォーム(日程タブ内)
--------------------------------------------------------- */
function AddScheduleForm({ onAdd, onCancel }) {
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("観光");
  const [location, setLocation] = useState("");
  const [arrivalLocation, setArrivalLocation] = useState("");
  const [arrivalIsLocalTime, setArrivalIsLocalTime] = useState(false);
  const [memo, setMemo] = useState("");
  const [reservationNumber, setReservationNumber] = useState("");

  const canSubmit = time && title;

  return (
    <div className="ts-inline-form">
      <div className="ts-grid-2">
        <InputField type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <InputField type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="到着時刻(任意)" />
      </div>
      <InputField placeholder="予定名" value={title} onChange={(e) => setTitle(e.target.value)} />
      <SelectField value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORY_LIST.map((c) => <option key={c} value={c}>{CATEGORY_META[c].emoji}</option>)}
      </SelectField>
      <div className="ts-grid-2">
        <InputField placeholder="出発場所(任意)" value={location} onChange={(e) => setLocation(e.target.value)} />
        <InputField placeholder="到着場所(任意)" value={arrivalLocation} onChange={(e) => setArrivalLocation(e.target.value)} />
      </div>
      <label className="ts-checkbox-label">
        <input type="checkbox" checked={arrivalIsLocalTime} onChange={(e) => setArrivalIsLocalTime(e.target.checked)} /> 到着時刻は現地時間
      </label>
      <InputField placeholder="予約番号(任意)" value={reservationNumber} onChange={(e) => setReservationNumber(e.target.value)} />
      <TextareaField placeholder="メモ(任意)" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
      <div className="ts-form-btn-row">
        <button className="ts-cancel-link" onClick={onCancel}>キャンセル</button>
        <button
          className="ts-primary-btn"
          style={{ opacity: canSubmit ? 1 : 0.4, pointerEvents: canSubmit ? "auto" : "none" }}
          onClick={() => canSubmit && onAdd({ id: uid(), time, endTime, title, category, location, arrivalLocation, arrivalIsLocalTime, memo, reservationNumber })}
        >
          この予定を追加
        </button>
      </div>
    </div>
  );
}

function ScheduleCard({ item, onDelete }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META["その他"];
  return (
    <div className="ts-schedule-card">
      <div className="ts-schedule-time-col">
        <div className="ts-schedule-time">{item.time}</div>
        {item.endTime && <div className="ts-schedule-endtime">↓ {item.endTime}{item.arrivalIsLocalTime ? "(現地)" : ""}</div>}
      </div>
      <div className="ts-schedule-body">
        <div className="ts-schedule-top-row">
          <span className="ts-cat-badge ts-cat-badge-emoji" style={{ background: meta.bg }}>{meta.emoji}</span>
          <span className="ts-schedule-title">{item.title}</span>
        </div>
        {(item.location || item.arrivalLocation) && (
          <div className="ts-schedule-route">
            {item.location && <span className="ts-route-link" onClick={() => openMap(item.location)}>{item.location} <ExternalLink size={11} /></span>}
            {item.location && item.arrivalLocation && <span> → </span>}
            {item.arrivalLocation && <span className="ts-route-link" onClick={() => openMap(item.arrivalLocation)}>{item.arrivalLocation} <ExternalLink size={11} /></span>}
          </div>
        )}
        {item.reservationNumber && <div className="ts-schedule-reservation"><Ticket size={12} /> {item.reservationNumber}</div>}
        {item.memo && <div className="ts-schedule-memo">{item.memo}</div>}
      </div>
      <button className="ts-x-btn" onClick={onDelete}>×</button>
    </div>
  );
}

function ScheduleTab({ trip, onAddItem, onDeleteItem }) {
  const dayList = listDaysInRange(trip.startDate, trip.endDate);
  const [selectedDay, setSelectedDay] = useState(dayList[0]);
  const [showForm, setShowForm] = useState(false);
  const items = (trip.days[selectedDay] || []).slice().sort((a, b) => (a.time < b.time ? -1 : 1));

  return (
    <div>
      <div className="ts-day-tabs">
        {dayList.map((d, i) => (
          <button key={d} className={"ts-day-tab" + (d === selectedDay ? " selected" : "")} onClick={() => { setSelectedDay(d); setShowForm(false); }}>
            Day{i + 1}
          </button>
        ))}
      </div>

      {items.length === 0 && !showForm && (
        <div className="ts-empty-block"><Calendar size={26} color="#BFC9D2" /><p>この日の予定はまだありません</p></div>
      )}

      <div className="ts-schedule-list">
        {items.map((item) => <ScheduleCard key={item.id} item={item} onDelete={() => onDeleteItem(selectedDay, item.id)} />)}
      </div>

      {showForm ? (
        <AddScheduleForm onCancel={() => setShowForm(false)} onAdd={(item) => { onAddItem(selectedDay, item); setShowForm(false); }} />
      ) : (
        <button className="ts-primary-btn" onClick={() => setShowForm(true)}><Plus size={16} /> 予定を追加</button>
      )}
    </div>
  );
}

function ReservationTab({ trip, onAdd, onDelete }) {
  const [category, setCategory] = useState(RESERVATION_CATEGORIES[0]);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [link, setLink] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: uid(), category, name: name.trim(), number, link });
    setName(""); setNumber(""); setLink("");
  };

  return (
    <div>
      {trip.reservations.length === 0 && <p className="ts-empty-text">まだ予約は登録されていません</p>}
      <div className="ts-reservation-list">
        {trip.reservations.map((r) => (
          <div className="ts-reservation-card" key={r.id}>
            <span className="ts-cat-badge" style={{ background: "#EEF0F2", color: "#6B7280" }}>{r.category}</span>
            <div className="ts-reservation-body">
              <div className="ts-reservation-name">{r.name}</div>
              {r.number && <div className="ts-reservation-number">{r.number}</div>}
              {r.link && <a className="ts-route-link" href={r.link} target="_blank" rel="noreferrer">リンクを開く <ExternalLink size={11} /></a>}
            </div>
            <button className="ts-x-btn" onClick={() => onDelete(r.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="ts-inline-form">
        <SelectField value={category} onChange={(e) => setCategory(e.target.value)}>
          {RESERVATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <InputField placeholder="予約名(例:ANA123便)" value={name} onChange={(e) => setName(e.target.value)} />
        <InputField placeholder="予約番号(任意)" value={number} onChange={(e) => setNumber(e.target.value)} />
        <InputField placeholder="リンク(任意)" value={link} onChange={(e) => setLink(e.target.value)} />
        <button className="ts-primary-btn" onClick={submit}><Plus size={16} /> 予約を追加</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   旅行詳細ページ
--------------------------------------------------------- */
const TABS = [
  { key: "schedule", label: "日程", icon: CalendarDays },
  { key: "packing", label: "持ち物", icon: Package },
  { key: "shopping", label: "買うもの", icon: ShoppingCart },
  { key: "todo", label: "やること", icon: CheckSquare },
  { key: "reservation", label: "予約", icon: Ticket },
];

function TripDetail({ trip, onBack, onOpenDrawer, updateTrip, onToggleArchive, onDeleteTrip }) {
  const [tab, setTab] = useState("schedule");
  const [todoPhase, setTodoPhase] = useState("pre");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addScheduleItem = (day, item) => {
    updateTrip((t) => ({ ...t, days: { ...t.days, [day]: [...(t.days[day] || []), item] } }));
  };
  const deleteScheduleItem = (day, id) => {
    updateTrip((t) => ({ ...t, days: { ...t.days, [day]: t.days[day].filter((i) => i.id !== id) } }));
  };

  const makeChecklistHandlers = (field) => ({
    onAdd: (text) => updateTrip((t) => ({ ...t, [field]: [...t[field], { id: uid(), text, checked: false }] })),
    onToggle: (id) => updateTrip((t) => ({ ...t, [field]: t[field].map((i) => i.id === id ? { ...i, checked: !i.checked } : i) })),
    onDelete: (id) => updateTrip((t) => ({ ...t, [field]: t[field].filter((i) => i.id !== id) })),
  });

  const packingHandlers = makeChecklistHandlers("packingList");
  const shoppingHandlers = makeChecklistHandlers("shoppingList");

  const todoHandlers = {
    onAdd: (text) => updateTrip((t) => ({ ...t, todos: { ...t.todos, [todoPhase]: [...t.todos[todoPhase], { id: uid(), text, checked: false }] } })),
    onToggle: (id) => updateTrip((t) => ({ ...t, todos: { ...t.todos, [todoPhase]: t.todos[todoPhase].map((i) => i.id === id ? { ...i, checked: !i.checked } : i) } })),
    onDelete: (id) => updateTrip((t) => ({ ...t, todos: { ...t.todos, [todoPhase]: t.todos[todoPhase].filter((i) => i.id !== id) } })),
  };

  const addReservation = (r) => updateTrip((t) => ({ ...t, reservations: [...t.reservations, r] }));
  const deleteReservation = (id) => updateTrip((t) => ({ ...t, reservations: t.reservations.filter((r) => r.id !== id) }));

  return (
    <div className="ts-screen">
      <div className="ts-detail-header">
        <button className="ts-icon-btn" onClick={onBack}><ArrowLeft size={20} color="#33566E" /></button>
        <div className="ts-detail-title-block">
          <div className="ts-detail-title">{trip.emoji} {trip.name}</div>
          <div className="ts-detail-sub">{trip.destination} ・ {formatRange(trip.startDate, trip.endDate)}</div>
        </div>
        <div className="ts-detail-actions">
          <button className="ts-icon-btn-soft" onClick={() => onToggleArchive(trip.id)}>
            {trip.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
          </button>
          <button className="ts-icon-btn" onClick={onOpenDrawer}><Menu size={20} color="#33566E" /></button>
        </div>
      </div>

      {trip.members.length > 0 && (
        <div className="ts-member-row">
          <Users size={14} color="#3FA9E0" />
          {trip.members.map((m, i) => <span className="ts-chip ts-chip-static" key={i}>{m}</span>)}
        </div>
      )}

      <div className="ts-tabs-row">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} className={"ts-tab-btn" + (tab === key ? " selected" : "")} onClick={() => setTab(key)}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="ts-content">
        {tab === "schedule" && <ScheduleTab trip={trip} onAddItem={addScheduleItem} onDeleteItem={deleteScheduleItem} />}
        {tab === "packing" && <ChecklistTab items={trip.packingList} placeholder="持ち物を入力" {...packingHandlers} />}
        {tab === "shopping" && <ChecklistTab items={trip.shoppingList} placeholder="買うものを入力" {...shoppingHandlers} />}
        {tab === "todo" && (
          <div>
            <div className="ts-day-tabs">
              {[["pre", "旅行前"], ["during", "旅行中"], ["post", "旅行後"]].map(([k, label]) => (
                <button key={k} className={"ts-day-tab" + (todoPhase === k ? " selected" : "")} onClick={() => setTodoPhase(k)}>{label}</button>
              ))}
            </div>
            <ChecklistTab items={trip.todos[todoPhase]} placeholder="やることを入力" {...todoHandlers} />
          </div>
        )}
        {tab === "reservation" && <ReservationTab trip={trip} onAdd={addReservation} onDelete={deleteReservation} />}

        <div className="ts-delete-trip-block">
          {!confirmDelete ? (
            <button className="ts-delete-link" onClick={() => setConfirmDelete(true)}>この旅行を削除する</button>
          ) : (
            <div className="ts-delete-confirm">
              <p>本当に削除しますか?元に戻せません</p>
              <button className="ts-delete-link" onClick={() => onDeleteTrip(trip.id)}>削除する</button>
              <button className="ts-cancel-link" onClick={() => setConfirmDelete(false)}>やめる</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ルートアプリ
--------------------------------------------------------- */
export default function App() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null);

  const activeTrip = trips.find((t) => t.id === activeTripId);

  // Firestoreの「appData/trips」ドキュメントをリアルタイムで監視する。
  // 家族の誰かがデータを書き換えると、ここで自動的に最新の内容に更新される。
  useEffect(() => {
    const tripsDocRef = doc(db, "appData", "trips");
    const unsubscribe = onSnapshot(
      tripsDocRef,
      (snapshot) => {
        const data = snapshot.data();
        setTrips(data && Array.isArray(data.value) ? data.value : []);
        setLoading(false);
      },
      (error) => {
        console.error("Firestoreの読み込みに失敗しました", error);
        setSaveError(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 新しい旅行データをFirestoreに書き込む共通関数。
  // 先に画面上は即座に更新し(体感を良くするため)、その後クラウドへ保存する。
  const pushTrips = async (newTrips) => {
    setTrips(newTrips);
    try {
      const tripsDocRef = doc(db, "appData", "trips");
      await setDoc(tripsDocRef, { value: newTrips });
    } catch (error) {
      console.error("Firestoreへの保存に失敗しました", error);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    }
  };

  const updateTrip = (tripId, updater) => {
    pushTrips(trips.map((t) => (t.id === tripId ? updater(t) : t)));
  };

  const toggleArchive = (tripId) => {
    pushTrips(trips.map((t) => (t.id === tripId ? { ...t, archived: !t.archived } : t)));
  };

  const deleteTrip = (tripId) => {
    pushTrips(trips.filter((t) => t.id !== tripId));
    setActiveTripId(null);
  };

  const createTrip = (trip) => {
    pushTrips([...trips, trip]);
  };

  const openTrip = (tripId) => {
    setActiveTripId(tripId);
    setDrawerOpen(false);
  };

  return (
    <div className="ts-root">
      {saveError && (
        <div className="ts-save-error-banner">保存できませんでした。通信環境をご確認ください</div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

        .ts-save-error-banner {
          position: sticky; top: 0; z-index: 30; background: #FFE3DC; color: #C25B3E;
          text-align: center; font-size: 12.5px; padding: 8px 12px; font-weight: 700;
        }
        .ts-root {
          --sky:#7FCBF2; --sky-soft:#B4E0F5; --sky-deep:#3FA9E0; --navy:#33566E;
          --pink:#FFB6B9; --pink-soft:#FFD5D7; --coral:#FFB4A2; --cream:#F5FBFD;
          --sand:#FDF0E9; --gray:#BFC9D2; --green:#71C6AC;
          font-family: 'Zen Kaku Gothic New', sans-serif;
          color: var(--navy);
          background: linear-gradient(180deg, #EDF8FC 0%, #F5FBFD 30%, #FDF6F1 100%);
          background-attachment: fixed;
          min-height: 100vh;
          max-width: 430px;
          margin: 0 auto;
          position: relative;
          box-sizing: border-box;
        }
        .ts-root * { box-sizing: border-box; }
        .ts-screen { min-height: 100vh; padding-bottom: 40px; }
        .ts-topbar, .ts-detail-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; position: sticky; top: 0; z-index: 5;
          background: rgba(245,251,253,0.85); backdrop-filter: blur(6px);
        }
        .ts-topbar-title { font-family:'Zen Maru Gothic'; font-weight:700; font-size:16px; }
        .ts-icon-btn { background:none; border:none; cursor:pointer; padding:6px; display:flex; align-items:center; }
        .ts-icon-btn-soft { background:#EEF0F2; border:none; border-radius:10px; padding:6px 8px; cursor:pointer; color:var(--navy); display:flex; align-items:center; }
        .ts-content { padding: 4px 16px 24px; }

        .ts-countdown-card {
          position: relative; overflow: hidden; border-radius: 28px; padding: 26px 20px 20px;
          text-align: center; margin: 8px 0 22px;
          background: linear-gradient(150deg, #8FD3F4 0%, #B4E4F6 55%, #FFD5D7 100%);
          box-shadow: 0 10px 24px rgba(63,169,224,0.18);
        }
        .ts-countdown-decoration {
          position:absolute; top:-30px; right:-30px; width:130px; height:130px; border-radius:50%;
          background: rgba(255,255,255,0.25);
        }
        .ts-countdown-emoji { font-size: 42px; position:relative; }
        .ts-countdown-label { font-family:'Zen Maru Gothic'; font-weight:900; font-size:27px; color:#fff; text-shadow:0 2px 6px rgba(0,0,0,0.1); margin-top:4px; position:relative; }
        .ts-countdown-name { font-weight:700; font-size:15px; color:#fff; margin-top:8px; position:relative; }
        .ts-countdown-dest { font-size:12px; color:#fff; display:flex; gap:4px; justify-content:center; align-items:center; margin-top:4px; position:relative; }
        .ts-countdown-range { font-size:11px; color:rgba(255,255,255,0.9); margin-top:2px; position:relative; }
        .ts-open-btn {
          margin-top:16px; background:#fff; color:var(--sky-deep); border:none; border-radius:16px;
          padding:11px 20px; font-weight:700; font-size:13.5px; cursor:pointer; position:relative;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08); width:100%;
        }

        .ts-home-empty {
          text-align:center; padding:40px 16px; background: linear-gradient(150deg, #B4E4F6, #FFD5D7);
          border-radius:24px; margin:8px 0 22px;
        }
        .ts-home-empty-title { font-family:'Zen Maru Gothic'; font-weight:700; font-size:17px; margin-top:10px; }
        .ts-home-empty-sub { font-size:13px; color:var(--navy); opacity:0.75; margin:6px 0 16px; }

        .ts-primary-btn {
          background: linear-gradient(135deg, #3FA9E0, #5FBEEA); color:#fff; border:none;
          border-radius:16px; padding:12px 18px; font-weight:700; font-size:14px; cursor:pointer;
          box-shadow: 0 6px 16px rgba(63,169,224,0.3); display:flex; align-items:center; justify-content:center; gap:6px;
          width:100%; margin-top:10px;
        }
        .ts-small-add-btn {
          background: linear-gradient(135deg, #5FBEEA, #7FCBF2); color:#fff; border:none; border-radius:12px;
          padding:0 14px; font-size:13px; font-weight:700; display:flex; align-items:center; gap:4px;
          white-space:nowrap; flex-shrink:0; cursor:pointer;
        }

        .ts-section-head { display:flex; align-items:center; gap:6px; font-family:'Zen Maru Gothic'; font-weight:700; font-size:14px; margin:22px 0 10px; }
        .ts-empty-block { text-align:center; padding:26px 10px; color:var(--gray); display:flex; flex-direction:column; align-items:center; gap:8px; }
        .ts-empty-block p { font-size:13px; margin:0; }
        .ts-empty-text { font-size:13px; color:var(--gray); text-align:center; padding: 10px 0; }

        .ts-mini-list, .ts-simple-list { display:flex; flex-direction:column; gap:8px; }
        .ts-mini-schedule-card {
          background:#fff; border-radius:16px; padding:12px 14px; display:flex; align-items:flex-start; gap:8px;
          box-shadow: 0 3px 10px rgba(63,169,224,0.07); cursor:pointer;
        }
        .ts-cat-dot { width:9px; height:9px; border-radius:50%; margin-top:5px; flex-shrink:0; }
        .ts-mini-time { font-weight:700; color: var(--sky-deep); font-size:13px; }
        .ts-mini-endtime { font-size:11px; color:var(--gray); }
        .ts-mini-body { display:flex; flex-direction:column; gap:2px; }
        .ts-mini-title { font-size:13.5px; font-weight:500; }
        .ts-mini-loc { font-size:11px; color:var(--gray); display:flex; align-items:center; gap:3px; }
        .ts-simple-row { background:#fff; border-radius:14px; padding:10px 12px; display:flex; align-items:center; gap:8px; font-size:13px; box-shadow: 0 3px 10px rgba(63,169,224,0.07); }

        /* input系共通 */
        .ts-input {
          border: 1.5px solid #E4E9ED; border-radius:12px; padding:10px 12px; font-size:13.5px;
          width:100%; box-sizing:border-box; -webkit-appearance:none; appearance:none;
          font-family:'Zen Kaku Gothic New', sans-serif; margin-bottom:10px; background:#fff; color:var(--navy);
        }
        .ts-grid-2 { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:8px; }
        .ts-grid-2 .ts-input { width:100%; }
        .ts-add-row { display:flex; gap:8px; align-items:flex-start; }
        .ts-add-row .ts-input { flex:1; }

        .ts-chip-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
        .ts-chip {
          background: var(--sky-soft); color: var(--navy); border-radius:999px; padding:5px 10px; font-size:12.5px;
          display:flex; align-items:center; gap:6px;
        }
        .ts-chip button { background:none; border:none; cursor:pointer; color:var(--navy); font-size:13px; line-height:1; }
        .ts-chip-static { background: var(--sky-soft); }

        .ts-checkbox-label { display:flex; align-items:center; gap:6px; font-size:12.5px; margin-bottom:10px; }

        .ts-sheet-overlay, .ts-drawer-overlay { position:fixed; inset:0; background:rgba(51,86,110,0.35); z-index:20; display:flex; }
        .ts-sheet { margin-top:auto; width:100%; max-width:430px; margin-left:auto; margin-right:auto; background:#fff;
          border-radius:24px 24px 0 0; padding:18px 18px 26px; max-height:85vh; overflow-y:auto; }
        .ts-sheet-handle { width:40px; height:4px; background:#E4E9ED; border-radius:99px; margin:0 auto 14px; }
        .ts-sheet-title { font-family:'Zen Maru Gothic'; font-weight:700; margin:0 0 14px; }
        .ts-emoji-picker { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
        .ts-emoji-btn { font-size:20px; background:#F5FBFD; border:1.5px solid #E4E9ED; border-radius:12px; width:44px; height:44px; cursor:pointer; }
        .ts-emoji-btn.selected { background: linear-gradient(135deg, #FFC2C4, #FFD5D7); border-color: transparent; }

        .ts-drawer { width:82%; max-width:340px; background:#fff; height:100%; padding:18px 16px; overflow-y:auto; }
        .ts-drawer-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .ts-drawer-top h3 { font-family:'Zen Maru Gothic'; margin:0; }
        .ts-drawer-subhead { font-family:'Zen Maru Gothic'; font-size:13px; font-weight:700; margin:20px 0 8px; color: var(--navy); opacity:0.8; }
        .ts-archive-toggle { background:none; border:none; color: var(--sky-deep); text-decoration:underline; font-size:13px; cursor:pointer; margin-top:16px; padding:0; }

        .ts-trip-card { display:flex; align-items:center; gap:8px; background:#fff; border-radius:16px; padding:10px 10px; margin-bottom:8px; box-shadow: 0 3px 10px rgba(63,169,224,0.07); }
        .ts-trip-card-main { display:flex; align-items:center; gap:10px; flex:1; cursor:pointer; }
        .ts-trip-emoji { font-size:26px; }
        .ts-trip-name { font-weight:700; font-size:13.5px; }
        .ts-trip-dest, .ts-trip-range { font-size:11px; color:var(--gray); display:flex; align-items:center; gap:3px; }

        .ts-day-tabs { display:flex; gap:8px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px; }
        .ts-day-tab { background:#fff; border:none; border-radius:14px; padding:8px 14px; font-size:12.5px; font-weight:700; opacity:0.5; white-space:nowrap; cursor:pointer; box-shadow: 0 3px 10px rgba(63,169,224,0.06); }
        .ts-day-tab.selected { opacity:1; background: linear-gradient(135deg, #3FA9E0, #5FBEEA); color:#fff; }

        .ts-tabs-row { display:flex; gap:8px; overflow-x:auto; padding: 8px 16px 4px; }
        .ts-tab-btn { display:flex; flex-direction:column; align-items:center; gap:2px; background:#fff; border:none; border-radius:16px; padding:9px 12px; font-size:10.5px; opacity:0.5; cursor:pointer; box-shadow: 0 3px 10px rgba(63,169,224,0.06); white-space:nowrap; flex-shrink:0; }
        .ts-tab-btn.selected { opacity:1; background: linear-gradient(135deg, #FFC2C4, #FFD5D7); box-shadow: 0 3px 12px rgba(63,169,224,0.08); }

        .ts-schedule-list { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
        .ts-schedule-card { display:flex; gap:10px; background:#fff; border-radius:18px; padding:12px 14px; box-shadow: 0 3px 12px rgba(63,169,224,0.08); position:relative; }
        .ts-schedule-time-col { min-width:52px; }
        .ts-schedule-time { font-weight:700; font-size:14px; }
        .ts-schedule-endtime { font-size:10.5px; color:var(--gray); margin-top:2px; }
        .ts-schedule-body { flex:1; display:flex; flex-direction:column; gap:5px; }
        .ts-schedule-top-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .ts-cat-badge { border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; }
        .ts-cat-badge-emoji { border-radius:50%; width:26px; height:26px; padding:0; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
        .ts-cat-badge-emoji-sm { width:22px; height:22px; font-size:12px; margin-top:1px; }
        .ts-schedule-title { font-size:13.5px; font-weight:500; }
        .ts-schedule-route { font-size:11.5px; display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
        .ts-route-link { color: var(--sky-deep); display:inline-flex; align-items:center; gap:3px; cursor:pointer; }
        .ts-schedule-reservation { font-size:11px; display:flex; align-items:center; gap:4px; color:var(--navy); opacity:0.75; }
        .ts-schedule-memo { font-size:11.5px; color:var(--gray); }
        .ts-x-btn { position:absolute; top:8px; right:8px; background:none; border:none; color:var(--gray); font-size:16px; cursor:pointer; opacity:0.6; }

        .ts-inline-form { background:#fff; border-radius:16px; padding:14px; margin-top:10px; box-shadow: 0 3px 10px rgba(63,169,224,0.07); }
        .ts-form-btn-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:6px; }
        .ts-cancel-link { background:none; border:none; color:var(--gray); font-size:12.5px; cursor:pointer; text-decoration:underline; }

        .ts-checklist-tab { display:flex; flex-direction:column; gap:12px; }
        .ts-checklist-items { display:flex; flex-direction:column; gap:8px; }
        .ts-checklist-row { background:#fff; border-radius:14px; padding:11px 12px; display:flex; align-items:center; gap:10px; box-shadow: 0 3px 10px rgba(63,169,224,0.07); font-size:13.5px; }
        .ts-checklist-row span:first-of-type { flex:1; }
        .ts-checked-text { text-decoration: line-through; color: var(--gray); }
        .ts-checkcircle { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--sky); background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; padding:0; }
        .ts-checkcircle.checked { background: var(--green); border-color: var(--green); }
        .ts-delete-link { background:none; border:none; color:#C25B3E; text-decoration:underline; font-size:12px; cursor:pointer; padding:0; }

        .ts-reservation-list { display:flex; flex-direction:column; gap:10px; margin-bottom:14px; }
        .ts-reservation-card { display:flex; gap:10px; align-items:flex-start; background:#fff; border-radius:16px; padding:12px 14px; box-shadow: 0 3px 10px rgba(63,169,224,0.07); position:relative; }
        .ts-reservation-name { font-weight:700; font-size:13.5px; }
        .ts-reservation-number { font-size:11.5px; color:var(--gray); margin-top:2px; }

        .ts-member-row { display:flex; align-items:center; gap:8px; padding:0 16px 10px; flex-wrap:wrap; }
        .ts-detail-title-block { flex:1; text-align:center; }
        .ts-detail-title { font-family:'Zen Maru Gothic'; font-weight:700; font-size:15px; }
        .ts-detail-sub { font-size:11px; color:var(--navy); opacity:0.6; margin-top:2px; }
        .ts-detail-actions { display:flex; align-items:center; gap:6px; }

        .ts-delete-trip-block { text-align:center; margin-top:30px; }
        .ts-delete-confirm { display:flex; flex-direction:column; align-items:center; gap:8px; }
        .ts-delete-confirm p { font-size:12.5px; color:var(--navy); opacity:0.8; margin:0; }
        .ts-loading-block { text-align:center; padding:80px 20px; color: var(--navy); display:flex; flex-direction:column; align-items:center; gap:10px; }
        .ts-loading-block p { font-size:13px; margin:0; }
      `}</style>

      {loading ? (
        <div className="ts-loading-block">
          <Sparkles size={28} color="#3FA9E0" />
          <p>読み込み中です…</p>
        </div>
      ) : activeTrip ? (
        <TripDetail
          trip={activeTrip}
          onBack={() => setActiveTripId(null)}
          onOpenDrawer={() => setDrawerOpen(true)}
          updateTrip={(updater) => updateTrip(activeTrip.id, updater)}
          onToggleArchive={toggleArchive}
          onDeleteTrip={deleteTrip}
        />
      ) : (
        <HomeScreen
          trips={trips}
          onOpenTrip={openTrip}
          onOpenDrawer={() => setDrawerOpen(true)}
          onAddTrip={() => { setDrawerOpen(true); setShowAddSheet(true); }}
        />
      )}

      {drawerOpen && (
        <TripDrawer
          trips={trips}
          onClose={() => setDrawerOpen(false)}
          onOpen={openTrip}
          onToggleArchive={toggleArchive}
          showAddSheet={showAddSheet}
          setShowAddSheet={setShowAddSheet}
          onCreateTrip={createTrip}
        />
      )}
    </div>
  );
}
