import { useState, useEffect, useCallback } from "react";

// ==================== COLOR THEME ====================
const theme = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  card: "#222018",
  border: "#2e2b25",
  accent: "#c9a84c",
  accentLight: "#e0c06a",
  accentDark: "#9a7a30",
  text: "#f0ead6",
  textMuted: "#8a8070",
  textDim: "#5a5448",
  danger: "#c0392b",
  success: "#27ae60",
  info: "#2980b9",
};

// ==================== INITIAL DATA ====================
const INITIAL_MENUS = [
  { id: 1, name: "カット", duration: 60, price: 3800 },
  { id: 2, name: "カット＋シャンプー", duration: 60, price: 4800 },
  { id: 3, name: "シェービング", duration: 60, price: 2500 },
  { id: 4, name: "パーマ", duration: 120, price: 8000 },
  { id: 5, name: "カラー", duration: 90, price: 6000 },
];

const INITIAL_CUSTOMERS = [
  { id: 1, name: "田中 太郎", phone: "090-1234-5678", email: "tanaka@example.com", memo: "常連客" },
  { id: 2, name: "鈴木 一郎", phone: "080-9876-5432", email: "suzuki@example.com", memo: "" },
  { id: 3, name: "山田 花子", phone: "070-1111-2222", email: "yamada@example.com", memo: "アレルギーあり" },
];

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 9〜19時

function generateId() {
  return Date.now() + Math.random().toString(36).slice(2);
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekDates(base) {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_NAMES = ["月", "火", "水", "木", "金", "土", "日"];

// ==================== GOOGLE SHEETS MODAL ====================
function GoogleSheetsModal({ onClose }) {
  const [sheetId, setSheetId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");

  const handleSave = () => {
    if (!sheetId || !apiKey) { setStatus("両方入力してください"); return; }
    localStorage.setItem("gs_sheet_id", sheetId);
    localStorage.setItem("gs_api_key", apiKey);
    setStatus("✅ 保存しました（実際の連携には Apps Script の設定が必要です）");
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>📊 Google スプレッドシート連携</h2>
        <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Google Apps Script を使ってスプレッドシートと連携できます。<br />
          詳細手順: スプレッドシートを開き「拡張機能」→「Apps Script」から<br />
          Web アプリとして公開し、URL をここに設定してください。
        </p>
        <label style={styles.label}>スプレッドシート ID</label>
        <input
          style={styles.input}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          value={sheetId}
          onChange={e => setSheetId(e.target.value)}
        />
        <label style={styles.label}>API キー / Apps Script URL</label>
        <input
          style={styles.input}
          placeholder="https://script.google.com/macros/s/.../exec"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
        <div style={{ background: "#1e2a1e", border: "1px solid #2a4a2a", borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <p style={{ color: "#6dbf6d", fontSize: 12, margin: 0, lineHeight: 1.7 }}>
            <strong>Apps Script サンプルコード：</strong><br />
            {`function doPost(e) {`}<br />
            {`  const data = JSON.parse(e.postData.contents);`}<br />
            {`  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();`}<br />
            {`  sheet.appendRow([data.date, data.customer, data.menu, data.price]);`}<br />
            {`  return ContentService.createTextOutput(JSON.stringify({ok:true}));`}<br />
            {`}`}
          </p>
        </div>
        {status && <p style={{ color: theme.success, fontSize: 13, marginBottom: 12 }}>{status}</p>}
        <div style={styles.btnRow}>
          <button style={styles.btnSecondary} onClick={onClose}>閉じる</button>
          <button style={styles.btnPrimary} onClick={handleSave}>設定を保存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== RESERVATION FORM MODAL ====================
function ReservationModal({ slot, customers, menus, onSave, onClose, onDelete, existing }) {
  const [customerId, setCustomerId] = useState(existing?.customerId || "");
  const [menuId, setMenuId] = useState(existing?.menuId || "");
  const [seat, setSeat] = useState(existing?.seat || 1);
  const [note, setNote] = useState(existing?.note || "");

  const selectedMenu = menus.find(m => m.id === Number(menuId));

  const handleSave = () => {
    if (!customerId || !menuId) return;
    const customer = customers.find(c => c.id === Number(customerId));
    onSave({
      id: existing?.id || generateId(),
      date: slot.date,
      hour: slot.hour,
      seat,
      customerId: Number(customerId),
      customerName: customer?.name,
      menuId: Number(menuId),
      menuName: selectedMenu?.name,
      price: selectedMenu?.price,
      note,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{existing ? "予約を編集" : "新規予約"}</h2>
        <p style={{ color: theme.accent, fontSize: 13, marginBottom: 16 }}>
          📅 {slot.date}　⏰ {slot.hour}:00　席 {seat}
        </p>
        <label style={styles.label}>席</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[1, 2].map(s => (
            <button key={s} onClick={() => setSeat(s)}
              style={{ ...styles.seatBtn, ...(seat === s ? styles.seatBtnActive : {}) }}>
              席 {s}
            </button>
          ))}
        </div>
        <label style={styles.label}>お客様</label>
        <select style={styles.select} value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">選択してください</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={styles.label}>メニュー</label>
        <select style={styles.select} value={menuId} onChange={e => setMenuId(e.target.value)}>
          <option value="">選択してください</option>
          {menus.map(m => <option key={m.id} value={m.id}>{m.name}　¥{m.price.toLocaleString()}</option>)}
        </select>
        {selectedMenu && (
          <div style={{ background: "#1a2030", border: "1px solid #2a3a5a", borderRadius: 8, padding: 10, marginBottom: 14 }}>
            <p style={{ color: "#7ab8f5", fontSize: 12, margin: 0 }}>
              ⏱ {selectedMenu.duration}分　　💴 ¥{selectedMenu.price.toLocaleString()}
            </p>
          </div>
        )}
        <label style={styles.label}>メモ</label>
        <textarea style={{ ...styles.input, height: 70, resize: "vertical" }} value={note} onChange={e => setNote(e.target.value)} placeholder="備考など" />
        <div style={styles.btnRow}>
          {existing && (
            <button style={{ ...styles.btnSecondary, color: theme.danger, borderColor: theme.danger }} onClick={() => onDelete(existing.id)}>
              削除
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button style={styles.btnSecondary} onClick={onClose}>キャンセル</button>
          <button style={styles.btnPrimary} onClick={handleSave} disabled={!customerId || !menuId}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== CUSTOMER MODAL ====================
function CustomerModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer || { name: "", phone: "", email: "", memo: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{customer ? "顧客を編集" : "新規顧客登録"}</h2>
        <label style={styles.label}>お名前 *</label>
        <input style={styles.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="田中 太郎" />
        <label style={styles.label}>電話番号</label>
        <input style={styles.input} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="090-0000-0000" />
        <label style={styles.label}>メールアドレス</label>
        <input style={styles.input} value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" />
        <label style={styles.label}>メモ</label>
        <textarea style={{ ...styles.input, height: 70, resize: "vertical" }} value={form.memo} onChange={e => set("memo", e.target.value)} />
        <div style={styles.btnRow}>
          <button style={styles.btnSecondary} onClick={onClose}>キャンセル</button>
          <button style={styles.btnPrimary} onClick={() => onSave({ ...form, id: customer?.id || generateId() })} disabled={!form.name}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== MENU MODAL ====================
function MenuModal({ menu, onSave, onClose }) {
  const [form, setForm] = useState(menu || { name: "", duration: 60, price: 0 });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{menu ? "メニューを編集" : "新規メニュー"}</h2>
        <label style={styles.label}>メニュー名 *</label>
        <input style={styles.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="カット" />
        <label style={styles.label}>所要時間（分）</label>
        <input style={styles.input} type="number" value={form.duration} onChange={e => set("duration", Number(e.target.value))} />
        <label style={styles.label}>料金（円）</label>
        <input style={styles.input} type="number" value={form.price} onChange={e => set("price", Number(e.target.value))} />
        <div style={styles.btnRow}>
          <button style={styles.btnSecondary} onClick={onClose}>キャンセル</button>
          <button style={styles.btnPrimary} onClick={() => onSave({ ...form, id: menu?.id || generateId() })} disabled={!form.name}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== CALENDAR VIEW ====================
function CalendarView({ reservations, customers, menus, onAddReservation, onEditReservation }) {
  const [baseDate, setBaseDate] = useState(new Date());
  const weekDates = getWeekDates(baseDate);
  const [modal, setModal] = useState(null);

  const getSlotReservations = (date, hour) => {
    const dateStr = formatDate(date);
    return reservations.filter(r => r.date === dateStr && r.hour === hour);
  };

  const handleCellClick = (date, hour, seat) => {
    const dateStr = formatDate(date);
    const existing = reservations.find(r => r.date === dateStr && r.hour === hour && r.seat === seat);
    setModal({ slot: { date: dateStr, hour }, seat, existing });
  };

  const handleSave = (reservation) => {
    if (modal?.existing) onEditReservation(reservation);
    else onAddReservation(reservation);
    setModal(null);
  };

  const handleDelete = (id) => {
    onEditReservation({ __delete: true, id });
    setModal(null);
  };

  const prevWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); };
  const nextWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); };
  const today = () => setBaseDate(new Date());

  const todayStr = formatDate(new Date());

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Calendar Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button style={styles.navBtn} onClick={prevWeek}>‹</button>
        <button style={{ ...styles.navBtn, fontSize: 12, padding: "6px 14px" }} onClick={today}>今日</button>
        <button style={styles.navBtn} onClick={nextWeek}>›</button>
        <span style={{ color: theme.text, fontWeight: 700, fontSize: 16 }}>
          {weekDates[0].getFullYear()}年 {weekDates[0].getMonth() + 1}月 {weekDates[0].getDate()}日
          〜 {weekDates[6].getMonth() + 1}月 {weekDates[6].getDate()}日
        </span>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, overflow: "auto", borderRadius: 12, border: `1px solid ${theme.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 52, position: "sticky", top: 0, left: 0, zIndex: 3, background: theme.surface }}>時</th>
              {weekDates.map((d, i) => {
                const isToday = formatDate(d) === todayStr;
                return (
                  <th key={i} style={{
                    ...styles.th, position: "sticky", top: 0, zIndex: 2, background: theme.surface,
                    color: isToday ? theme.accent : (i >= 5 ? "#e88" : theme.text),
                    borderBottom: isToday ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  }}>
                    <div style={{ fontSize: 11, color: theme.textMuted }}>{DAY_NAMES[i]}</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{d.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour}>
                <td style={{ ...styles.td, textAlign: "center", fontSize: 12, color: theme.textMuted, background: theme.surface, position: "sticky", left: 0, zIndex: 1, fontWeight: 600 }}>
                  {hour}:00
                </td>
                {weekDates.map((d, di) => {
                  const slotRsvs = getSlotReservations(d, hour);
                  const seat1 = slotRsvs.find(r => r.seat === 1);
                  const seat2 = slotRsvs.find(r => r.seat === 2);
                  const isToday = formatDate(d) === todayStr;
                  return (
                    <td key={di} style={{ ...styles.td, padding: 2, background: isToday ? "#1a1a14" : "transparent", verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: 2, height: 52 }}>
                        {[{ seat: 1, rsv: seat1 }, { seat: 2, rsv: seat2 }].map(({ seat, rsv }) => (
                          <div key={seat} onClick={() => handleCellClick(d, hour, seat)}
                            style={{
                              flex: 1, borderRadius: 5, cursor: "pointer", transition: "all 0.15s",
                              background: rsv ? `${theme.accentDark}cc` : "transparent",
                              border: rsv ? `1px solid ${theme.accent}` : `1px dashed ${theme.border}`,
                              padding: "2px 4px", overflow: "hidden",
                              display: "flex", flexDirection: "column", justifyContent: "center",
                            }}
                            onMouseEnter={e => { if (!rsv) e.currentTarget.style.background = "#2a2820"; }}
                            onMouseLeave={e => { if (!rsv) e.currentTarget.style.background = "transparent"; }}
                          >
                            {rsv ? (
                              <>
                                <div style={{ fontSize: 10, color: theme.accentLight, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {rsv.customerName}
                                </div>
                                <div style={{ fontSize: 9, color: theme.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {rsv.menuName}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 9, color: theme.textDim, textAlign: "center" }}>席{seat}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ReservationModal
          slot={{ date: modal.slot.date, hour: modal.slot.hour }}
          customers={customers}
          menus={menus}
          existing={modal.existing}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ==================== CUSTOMER LIST VIEW ====================
function CustomerListView({ customers, reservations, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);

  const filtered = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search) || c.email.includes(search)
  );

  const getVisitCount = (id) => reservations.filter(r => r.customerId === id).length;
  const getTotalSpend = (id) => reservations.filter(r => r.customerId === id).reduce((s, r) => s + (r.price || 0), 0);

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} placeholder="🔍 名前・電話・メールで検索" value={search} onChange={e => setSearch(e.target.value)} />
        <button style={styles.btnPrimary} onClick={() => setModal({ mode: "new" })}>＋ 新規登録</button>
      </div>
      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["名前", "電話番号", "メール", "来店回数", "累計金額", "メモ", "操作"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${theme.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = "#1e1c18"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ ...styles.td, fontWeight: 600, color: theme.text }}>{c.name}</td>
                <td style={styles.td}>{c.phone}</td>
                <td style={styles.td}>{c.email}</td>
                <td style={{ ...styles.td, textAlign: "center", color: theme.accent, fontWeight: 700 }}>{getVisitCount(c.id)}回</td>
                <td style={{ ...styles.td, textAlign: "right", color: theme.accentLight, fontWeight: 700 }}>¥{getTotalSpend(c.id).toLocaleString()}</td>
                <td style={{ ...styles.td, color: theme.textMuted, fontSize: 12 }}>{c.memo}</td>
                <td style={styles.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={styles.actionBtn} onClick={() => setModal({ mode: "edit", customer: c })}>編集</button>
                    <button style={{ ...styles.actionBtn, color: theme.danger }} onClick={() => onDelete(c.id)}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <CustomerModal
          customer={modal.mode === "edit" ? modal.customer : null}
          onSave={c => { if (modal.mode === "edit") onEdit(c); else onAdd(c); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ==================== MENU VIEW ====================
function MenuView({ menus, onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState(null);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={styles.btnPrimary} onClick={() => setModal({ mode: "new" })}>＋ メニュー追加</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {menus.map(m => (
          <div key={m.id} style={styles.menuCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: theme.text, marginBottom: 6 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: theme.textMuted }}>⏱ {m.duration}分</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: theme.accent }}>¥{m.price.toLocaleString()}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={{ ...styles.actionBtn, flex: 1 }} onClick={() => setModal({ mode: "edit", menu: m })}>編集</button>
              <button style={{ ...styles.actionBtn, flex: 1, color: theme.danger }} onClick={() => onDelete(m.id)}>削除</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <MenuModal
          menu={modal.mode === "edit" ? modal.menu : null}
          onSave={m => { if (modal.mode === "edit") onEdit(m); else onAdd(m); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ==================== SALES VIEW ====================
function SalesView({ reservations, menus }) {
  const [period, setPeriod] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  const filtered = reservations.filter(r => {
    if (period === "month") return r.date?.startsWith(selectedMonth);
    if (period === "today") return r.date === formatDate(new Date());
    return true;
  });

  const totalSales = filtered.reduce((s, r) => s + (r.price || 0), 0);
  const totalCount = filtered.length;

  // Menu breakdown
  const menuStats = menus.map(m => {
    const rsvs = filtered.filter(r => r.menuId === m.id);
    return { ...m, count: rsvs.length, total: rsvs.reduce((s, r) => s + (r.price || 0), 0) };
  }).filter(m => m.count > 0).sort((a, b) => b.total - a.total);

  // Daily breakdown for month view
  const dailyMap = {};
  filtered.forEach(r => {
    dailyMap[r.date] = (dailyMap[r.date] || 0) + (r.price || 0);
  });
  const dailyEntries = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
  const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);

  const exportCSV = () => {
    const header = "日付,時間,席,顧客名,メニュー,金額,メモ";
    const rows = filtered.map(r => `${r.date},${r.hour}:00,${r.seat},${r.customerName || ""},${r.menuName || ""},${r.price || 0},${r.note || ""}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `売上_${selectedMonth}.csv`; a.click();
  };

  return (
    <div style={{ flex: 1 }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[["today", "今日"], ["month", "月別"], ["all", "全期間"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)}
            style={{ ...styles.navBtn, ...(period === v ? { background: theme.accent, color: "#000", border: `1px solid ${theme.accent}` } : {}) }}>
            {l}
          </button>
        ))}
        {period === "month" && (
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ ...styles.input, marginBottom: 0, width: "auto", padding: "6px 12px" }} />
        )}
        <div style={{ flex: 1 }} />
        <button style={styles.btnPrimary} onClick={exportCSV}>📥 CSV ダウンロード</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>売上合計</div>
          <div style={styles.kpiValue}>¥{totalSales.toLocaleString()}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>予約件数</div>
          <div style={styles.kpiValue}>{totalCount}件</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>客単価</div>
          <div style={styles.kpiValue}>¥{totalCount > 0 ? Math.round(totalSales / totalCount).toLocaleString() : 0}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Menu breakdown */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>メニュー別売上</h3>
          {menuStats.length === 0 ? <p style={{ color: theme.textMuted, fontSize: 13 }}>データなし</p> : menuStats.map(m => (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: theme.text, fontSize: 13 }}>{m.name} <span style={{ color: theme.textMuted }}>×{m.count}</span></span>
                <span style={{ color: theme.accentLight, fontWeight: 700, fontSize: 13 }}>¥{m.total.toLocaleString()}</span>
              </div>
              <div style={{ background: theme.border, borderRadius: 3, height: 6 }}>
                <div style={{ background: theme.accent, height: 6, borderRadius: 3, width: `${(m.total / totalSales) * 100}%`, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Daily chart */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>日別売上</h3>
          {dailyEntries.length === 0 ? <p style={{ color: theme.textMuted, fontSize: 13 }}>データなし</p> : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, overflow: "auto" }}>
              {dailyEntries.map(([date, val]) => (
                <div key={date} style={{ flex: 1, minWidth: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", background: theme.accent, borderRadius: "3px 3px 0 0", height: `${(val / maxDaily) * 100}px`, transition: "height 0.4s", minHeight: 4 }} title={`¥${val.toLocaleString()}`} />
                  <div style={{ fontSize: 9, color: theme.textMuted, writingMode: "vertical-rl", height: 32 }}>{date.slice(5)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent reservations table */}
      <div style={{ ...styles.card, marginTop: 20 }}>
        <h3 style={styles.cardTitle}>予約一覧</h3>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["日付", "時間", "席", "顧客名", "メニュー", "金額", "メモ"].map(h => (
                  <th key={h} style={{ ...styles.th, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => (b.date + b.hour).localeCompare(a.date + a.hour)).map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={styles.td}>{r.date}</td>
                  <td style={styles.td}>{r.hour}:00</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>席{r.seat}</td>
                  <td style={{ ...styles.td, color: theme.text, fontWeight: 600 }}>{r.customerName}</td>
                  <td style={styles.td}>{r.menuName}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: theme.accentLight, fontWeight: 700 }}>¥{(r.price || 0).toLocaleString()}</td>
                  <td style={{ ...styles.td, color: theme.textMuted }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== STYLES ====================
const styles = {
  th: { padding: "10px 12px", textAlign: "left", color: theme.textMuted, fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, whiteSpace: "nowrap" },
  td: { padding: "10px 12px", color: theme.textMuted, fontSize: 13 },
  input: { width: "100%", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 14px", color: theme.text, fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  select: { width: "100%", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 14px", color: theme.text, fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "inherit", cursor: "pointer" },
  label: { display: "block", color: theme.textMuted, fontSize: 12, marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" },
  btnPrimary: { background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit", transition: "background 0.15s", whiteSpace: "nowrap" },
  btnSecondary: { background: "transparent", color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  navBtn: { background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontFamily: "inherit" },
  actionBtn: { background: theme.card, color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  seatBtn: { flex: 1, background: theme.card, color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  seatBtnActive: { background: theme.accent, color: "#000", border: `1px solid ${theme.accent}` },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" },
  modal: { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 28, width: "min(95vw, 460px)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: 800, marginBottom: 18, marginTop: 0 },
  btnRow: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  menuCard: { background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 18 },
  kpiCard: { background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "16px 20px" },
  kpiLabel: { color: theme.textMuted, fontSize: 12, marginBottom: 6, fontWeight: 600 },
  kpiValue: { color: theme.accent, fontSize: 26, fontWeight: 800 },
  card: { background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 16 },
};

// ==================== MAIN APP ====================
export default function App() {
  const [tab, setTab] = useState("calendar");
  const [reservations, setReservations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("reservations") || "[]"); } catch { return []; }
  });
  const [customers, setCustomers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("customers") || JSON.stringify(INITIAL_CUSTOMERS)); } catch { return INITIAL_CUSTOMERS; }
  });
  const [menus, setMenus] = useState(() => {
    try { return JSON.parse(localStorage.getItem("menus") || JSON.stringify(INITIAL_MENUS)); } catch { return INITIAL_MENUS; }
  });
  const [showSheets, setShowSheets] = useState(false);

  // Persist
  useEffect(() => { localStorage.setItem("reservations", JSON.stringify(reservations)); }, [reservations]);
  useEffect(() => { localStorage.setItem("customers", JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem("menus", JSON.stringify(menus)); }, [menus]);

  const handleAddReservation = (r) => setReservations(p => [...p, r]);
  const handleEditReservation = (r) => {
    if (r.__delete) setReservations(p => p.filter(x => x.id !== r.id));
    else setReservations(p => p.map(x => x.id === r.id ? r : x));
  };

  const TABS = [
    { key: "calendar", label: "📅 予約カレンダー" },
    { key: "customers", label: "👤 顧客リスト" },
    { key: "menus", label: "✂️ メニュー設定" },
    { key: "sales", label: "💴 売上管理" },
  ];

  const todayRsvs = reservations.filter(r => r.date === formatDate(new Date()));

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", color: theme.textMuted, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: theme.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✂</div>
          <div>
            <div style={{ color: theme.text, fontWeight: 800, fontSize: 16, letterSpacing: "0.05em" }}>BARBER MANAGER</div>
            <div style={{ color: theme.textMuted, fontSize: 10 }}>理容室予約管理システム</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: theme.card, borderRadius: 8, padding: "6px 14px", border: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: 11, color: theme.textMuted }}>今日の予約　</span>
          <span style={{ color: theme.accent, fontWeight: 700 }}>{todayRsvs.length}件</span>
        </div>
        <button style={{ ...styles.navBtn, fontSize: 12 }} onClick={() => setShowSheets(true)}>
          📊 Google Sheets 連携
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "0 24px", display: "flex", gap: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              background: "none", border: "none", padding: "14px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              color: tab === t.key ? theme.accent : theme.textMuted,
              borderBottom: tab === t.key ? `2px solid ${theme.accent}` : "2px solid transparent",
              transition: "all 0.2s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "calendar" && (
          <CalendarView
            reservations={reservations}
            customers={customers}
            menus={menus}
            onAddReservation={handleAddReservation}
            onEditReservation={handleEditReservation}
          />
        )}
        {tab === "customers" && (
          <CustomerListView
            customers={customers}
            reservations={reservations}
            onAdd={c => setCustomers(p => [...p, c])}
            onEdit={c => setCustomers(p => p.map(x => x.id === c.id ? c : x))}
            onDelete={id => setCustomers(p => p.filter(c => c.id !== id))}
          />
        )}
        {tab === "menus" && (
          <MenuView
            menus={menus}
            onAdd={m => setMenus(p => [...p, m])}
            onEdit={m => setMenus(p => p.map(x => x.id === m.id ? m : x))}
            onDelete={id => setMenus(p => p.filter(m => m.id !== id))}
          />
        )}
        {tab === "sales" && (
          <SalesView reservations={reservations} menus={menus} />
        )}
      </div>

      {showSheets && <GoogleSheetsModal onClose={() => setShowSheets(false)} />}
    </div>
  );
}
