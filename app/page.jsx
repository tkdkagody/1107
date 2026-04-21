"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TASKS } from "../lib/defaultTasks";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const PRIORITY_ORDER = { P1: 1, P2: 2, P3: 3 };

const EMPTY_FORM = {
  priority: "P2",
  title: "",
  owner: "",
  target: "",
  neededInfo: "",
  memo: "",
  estimatedCost: "",
};

function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.id - b.id;
  });
}

function parseCost(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toPayload(form) {
  return {
    priority: form.priority,
    title: form.title.trim(),
    owner: form.owner.trim(),
    target: form.target.trim(),
    needed_info: form.neededInfo.trim(),
    memo: form.memo.trim(),
    estimated_cost: parseCost(form.estimatedCost),
  };
}

function normalizeTask(row) {
  return {
    id: row.id,
    priority: row.priority,
    title: row.title,
    owner: row.owner ?? "",
    target: row.target ?? "",
    neededInfo: row.needed_info ?? "",
    memo: row.memo ?? "",
    estimatedCost: row.estimated_cost,
    done: Boolean(row.done),
  };
}

export default function Page() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function fetchTasks() {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage("Supabase 환경 변수가 없습니다. README를 보고 .env.local을 설정해주세요.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.from("wedding_tasks").select("*").order("id", {
      ascending: true,
    });

    if (error) {
      setErrorMessage(`데이터를 불러오지 못했습니다: ${error.message}`);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      const seedRows = DEFAULT_TASKS.map((task) => ({
        priority: task.priority,
        title: task.title,
        owner: task.owner,
        target: task.target,
        needed_info: task.neededInfo,
        memo: task.memo,
        estimated_cost: task.estimatedCost,
        done: task.done,
      }));

      const { data: seeded, error: seedError } = await supabase
        .from("wedding_tasks")
        .insert(seedRows)
        .select("*");

      if (seedError) {
        setErrorMessage(`초기 데이터를 넣지 못했습니다: ${seedError.message}`);
      } else {
        setTasks(sortTasks((seeded ?? []).map(normalizeTask)));
      }
    } else {
      setTasks(sortTasks(data.map(normalizeTask)));
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  const ownerOptions = useMemo(() => {
    const names = tasks
      .map((task) => task.owner.trim())
      .filter((name) => name.length > 0);
    return [...new Set(names)];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (ownerFilter !== "ALL" && task.owner !== ownerFilter) return false;
      if (statusFilter === "DONE" && !task.done) return false;
      if (statusFilter === "TODO" && task.done) return false;
      if (!keyword) return true;
      const text = [task.title, task.owner, task.target, task.neededInfo, task.memo]
        .join(" ")
        .toLowerCase();
      return text.includes(keyword);
    });
  }, [tasks, search, priorityFilter, ownerFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.done).length;
    const todo = total - done;
    const totalCost = tasks.reduce((sum, task) => {
      const cost = parseCost(task.estimatedCost);
      return cost === null ? sum : sum + cost;
    }, 0);
    return { total, done, todo, totalCost };
  }, [tasks]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase || !form.title.trim()) return;

    setSaving(true);
    setErrorMessage("");

    if (editingId !== null) {
      const payload = toPayload(form);
      const { data, error } = await supabase
        .from("wedding_tasks")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .single();

      if (error) {
        setErrorMessage(`수정에 실패했습니다: ${error.message}`);
      } else {
        setTasks((prev) => sortTasks(prev.map((task) => (task.id === editingId ? normalizeTask(data) : task))));
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from("wedding_tasks")
        .insert({
          ...toPayload(form),
          done: false,
        })
        .select("*")
        .single();

      if (error) {
        setErrorMessage(`추가에 실패했습니다: ${error.message}`);
      } else {
        setTasks((prev) => sortTasks([...prev, normalizeTask(data)]));
        resetForm();
      }
    }

    setSaving(false);
  }

  async function handleDelete(id) {
    if (!supabase) return;
    setSaving(true);
    setErrorMessage("");

    const { error } = await supabase.from("wedding_tasks").delete().eq("id", id);
    if (error) {
      setErrorMessage(`삭제에 실패했습니다: ${error.message}`);
    } else {
      setTasks((prev) => prev.filter((task) => task.id !== id));
      if (editingId === id) resetForm();
    }

    setSaving(false);
  }

  async function handleToggleDone(task) {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("wedding_tasks")
      .update({ done: !task.done })
      .eq("id", task.id)
      .select("*")
      .single();

    if (error) {
      setErrorMessage(`상태 변경에 실패했습니다: ${error.message}`);
      return;
    }

    setTasks((prev) => sortTasks(prev.map((item) => (item.id === task.id ? normalizeTask(data) : item))));
  }

  function handleEdit(task) {
    setEditingId(task.id);
    setForm({
      priority: task.priority,
      title: task.title,
      owner: task.owner,
      target: task.target,
      neededInfo: task.neededInfo,
      memo: task.memo,
      estimatedCost: task.estimatedCost === null ? "" : String(task.estimatedCost),
    });
  }

  function renderCost(value) {
    const cost = parseCost(value);
    return cost === null ? "-" : `${cost.toLocaleString()}만원`;
  }

  return (
    <div className="app">
      <header className="top">
        <h1>결혼 준비 프로젝트 보드</h1>
        <p>항목을 하나씩 추가하고 체크하면서 전체 준비 과정을 정리해요.</p>
      </header>

      {errorMessage && <p className="error">{errorMessage}</p>}

      <section className="summary">
        <article>
          <span>전체</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>완료</span>
          <strong>{summary.done}</strong>
        </article>
        <article>
          <span>진행중</span>
          <strong>{summary.todo}</strong>
        </article>
        <article>
          <span>예상 총비용</span>
          <strong>{summary.totalCost.toLocaleString()}만원</strong>
        </article>
      </section>

      <section className="panel">
        <h2>{editingId !== null ? "항목 수정" : "새 항목 추가"}</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            우선순위
            <select name="priority" value={form.priority} onChange={handleChange}>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </label>
          <label>
            항목명 *
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="예: 모바일 청첩장 제작"
              required
            />
          </label>
          <label>
            담당
            <input name="owner" value={form.owner} onChange={handleChange} placeholder="예: 다희" />
          </label>
          <label>
            목표 시점
            <input
              name="target"
              value={form.target}
              onChange={handleChange}
              placeholder="예: 예식 2개월 전"
            />
          </label>
          <label>
            필요 정보
            <input
              name="neededInfo"
              value={form.neededInfo}
              onChange={handleChange}
              placeholder="예: 업체 3곳 견적"
            />
          </label>
          <label>
            예상비용(만원)
            <input
              name="estimatedCost"
              value={form.estimatedCost}
              onChange={handleChange}
              placeholder="예: 30"
              inputMode="numeric"
            />
          </label>
          <label className="full">
            메모
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
              rows={3}
              placeholder="꼭 확인할 조건이나 주의사항"
            />
          </label>
          <div className="form-actions full">
            <button type="submit" disabled={saving || !isSupabaseConfigured}>
              {saving ? "저장중..." : editingId !== null ? "수정 저장" : "항목 추가"}
            </button>
            {editingId !== null && (
              <button type="button" className="ghost" onClick={resetForm}>
                취소
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>필터</h2>
        <div className="filters">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="검색 (항목명/메모/필요 정보)"
          />
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="ALL">전체 우선순위</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="ALL">전체 담당</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">전체 상태</option>
            <option value="TODO">진행중</option>
            <option value="DONE">완료</option>
          </select>
        </div>
      </section>

      <section className="panel">
        <h2>준비 항목</h2>
        {loading ? (
          <p className="empty">불러오는 중...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>완료</th>
                  <th>우선순위</th>
                  <th>항목</th>
                  <th>담당</th>
                  <th>목표 시점</th>
                  <th>필요 정보</th>
                  <th>메모</th>
                  <th>예상비용</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className={task.done ? "done-row" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggleDone(task)}
                        aria-label={`${task.title} 완료`}
                      />
                    </td>
                    <td>
                      <span className={`badge ${task.priority}`}>{task.priority}</span>
                    </td>
                    <td>{task.title}</td>
                    <td>{task.owner || "-"}</td>
                    <td>{task.target || "-"}</td>
                    <td>{task.neededInfo || "-"}</td>
                    <td>{task.memo || "-"}</td>
                    <td>{renderCost(task.estimatedCost)}</td>
                    <td className="actions">
                      <button type="button" className="small" onClick={() => handleEdit(task)}>
                        수정
                      </button>
                      <button type="button" className="small danger" onClick={() => handleDelete(task.id)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTasks.length === 0 && <p className="empty">조건에 맞는 항목이 없습니다.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
