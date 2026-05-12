import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminApi,
  type AdminFilterOptionsResponse,
  type AdminEsAnalyticsResponse,
  type AdminUserOption,
} from "../../shared/api/adminApi";
import { useAuthStore } from "../../app/store/authStore";

type Filters = {
  from: string;
  to: string;
  timezone: string;
  chapterCode: string;
  nodeCode: string;
  topN: number;
};

function formatDateInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function makeDefaultFilters(): Filters {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
    chapterCode: "",
    nodeCode: "",
    topN: 20,
  };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminEsAnalyticsResponse | null>(null);

  const [filters, setFilters] = useState<Filters>(makeDefaultFilters());
  const [userKeyword, setUserKeyword] = useState("");
  const [candidates, setCandidates] = useState<AdminUserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AdminUserOption[]>([]);
  const [trackNodeIndex, setTrackNodeIndex] = useState(0);
  const [filterOptions, setFilterOptions] = useState<AdminFilterOptionsResponse>({
    chapters: [],
    nodes: [],
  });

  const selectedUserIds = useMemo(() => selectedUsers.map((u) => u.userId), [selectedUsers]);

  const loadInsights = async (targetFilters: Filters, userIds: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.getEsInsights({
        from: `${targetFilters.from}T00:00:00`,
        to: `${targetFilters.to}T23:59:59`,
        timezone: targetFilters.timezone,
        userIds,
        chapterCode: targetFilters.chapterCode || null,
        nodeCode: targetFilters.nodeCode || null,
        topN: targetFilters.topN,
      });
      setData(response);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "관리자 분석 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async (keyword: string) => {
    try {
      const users = await adminApi.searchUsers({ q: keyword, limit: 12 });
      setCandidates(users);
    } catch {
      setCandidates([]);
    }
  };

  const loadFilterOptions = async (chapterCode?: string) => {
    try {
      const options = await adminApi.getFilterOptions({ chapterCode: chapterCode || null });
      setFilterOptions(options);
    } catch {
      setFilterOptions({ chapters: [], nodes: [] });
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    if (role !== "ADMIN") {
      navigate("/lobby", { replace: true });
      return;
    }

    const defaults = makeDefaultFilters();
    setFilters(defaults);
    void loadFilterOptions();
    void loadInsights(defaults, []);
  }, [isInitialized, role, navigate]);

  useEffect(() => {
    void loadFilterOptions(filters.chapterCode);
    setFilters((prev) => ({ ...prev, nodeCode: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.chapterCode]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevRootOverflow = root?.style.overflow;

    html.style.overflow = "auto";
    body.style.overflow = "auto";
    if (root) root.style.overflow = "visible";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      if (root && prevRootOverflow !== undefined) root.style.overflow = prevRootOverflow;
    };
  }, []);

  useEffect(() => {
    const keyword = userKeyword.trim();
    const timer = window.setTimeout(() => {
      void loadCandidates(keyword);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [userKeyword]);

  const onApply = () => {
    void loadInsights(filters, selectedUserIds);
  };

  const onQuickRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));

    const next = {
      ...filters,
      from: formatDateInput(from),
      to: formatDateInput(to),
    };
    setFilters(next);
    void loadInsights(next, selectedUserIds);
  };

  const onReset = () => {
    const defaults = makeDefaultFilters();
    setFilters(defaults);
    setSelectedUsers([]);
    setUserKeyword("");
    setCandidates([]);
    void loadInsights(defaults, []);
  };

  const addUser = (candidate: AdminUserOption) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.userId === candidate.userId)) return prev;
      return [...prev, candidate];
    });
    setUserKeyword("");
  };

  const removeUser = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.userId !== userId));
  };

  const timelineData = useMemo(() => {
    if (!data) return [];
    return data.timeline.map((row) => ({
      date: row.date.slice(5),
      요청: row.totalCount,
      성공: row.successCount,
      실패: row.failCount,
      오류: row.errorCount,
    }));
  }, [data]);

  const bottleneckData = useMemo(() => {
    if (!data) return [];
    return data.bottlenecks.map((row) => ({
      노드: row.nodeCode,
      실패율: row.failRatePercent,
      실패: row.failCount,
      총요청: row.totalCount,
    }));
  }, [data]);

  const commandFailData = useMemo(() => {
    if (!data) return [];
    return data.failCommands.map((row) => ({
      명령어: row.command,
      실패: row.failCount,
      오류: row.errorCount,
      요청: row.totalCount,
    }));
  }, [data]);

  const selectedMode = selectedUsers.length === 1 ? "single" : selectedUsers.length === 2 ? "compare" : "multi";

  const journeyByUserId = useMemo(() => {
    const map = new Map<number, AdminEsAnalyticsResponse["userJourneys"][number]>();
    data?.userJourneys.forEach((j) => map.set(j.user.userId, j));
    return map;
  }, [data]);

  const trackUsers = useMemo(() => {
    if (selectedMode === "single") return selectedUsers.slice(0, 1);
    if (selectedMode === "compare") return selectedUsers.slice(0, 2);
    return [];
  }, [selectedMode, selectedUsers]);

  const trackNodeCodes = useMemo(() => {
    if (trackUsers.length === 0) return [] as string[];
    const set = new Set<string>();
    for (const u of trackUsers) {
      const journey = journeyByUserId.get(u.userId);
      journey?.nodeActionSummaries?.forEach((n) => {
        if (n.nodeCode) set.add(n.nodeCode);
      });
    }
    return Array.from(set);
  }, [trackUsers, journeyByUserId]);

  useEffect(() => {
    setTrackNodeIndex(0);
  }, [selectedUsers, filters.from, filters.to, filters.chapterCode, filters.nodeCode, filters.topN]);

  const currentTrackNodeCode =
    trackNodeCodes.length > 0
      ? trackNodeCodes[Math.min(trackNodeIndex, Math.max(trackNodeCodes.length - 1, 0))]
      : null;

  const getNodeSummaryForUser = (userId: number, nodeCode: string | null) => {
    if (!nodeCode) return null;
    const journey = journeyByUserId.get(userId);
    if (!journey) return null;
    return journey.nodeActionSummaries.find((s) => s.nodeCode === nodeCode) ?? null;
  };

  if (loading) {
    return <div className="min-h-screen bg-[#060a12] text-white p-8">관리자 분석 데이터 로딩 중...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-[#060a12] text-red-300 p-8">{error}</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-[#060a12] text-white p-8">데이터가 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 p-5 md:p-8 font-desktop-ui pb-12">
      <header className="mb-6">
        <p className="text-xs text-cyan-300 uppercase tracking-wider">Admin Analytics</p>
        <h1 className="text-2xl md:text-4xl font-semibold mt-1">운영 분석 대시보드</h1>
        <p className="text-sm text-slate-400 mt-2">
          Elasticsearch 로그 이력 기반으로 기간/유저/챕터/노드 필터 분석을 제공합니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge label={`인덱스: ${data.source.indexPattern}`} tone="info" />
          <Badge
            label={data.source.fallbackUsed ? "DB Fallback" : "ES Live"}
            tone={data.source.fallbackUsed ? "warn" : "ok"}
          />
          <Badge label={data.source.message} tone="neutral" />
        </div>
      </header>

      <section className="rounded-xl border border-slate-800/80 bg-[#0a1020] p-4 md:p-5 mb-6">
        <h2 className="text-base md:text-lg font-semibold mb-3">필터</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <FilterField label="시작일">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            />
          </FilterField>
          <FilterField label="종료일">
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            />
          </FilterField>
          <FilterField label="타임존">
            <input
              value={filters.timezone}
              onChange={(e) => setFilters((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              placeholder="Asia/Seoul"
            />
          </FilterField>
          <FilterField label="챕터 코드">
            <select
              value={filters.chapterCode}
              onChange={(e) => setFilters((p) => ({ ...p, chapterCode: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            >
              <option value="">전체 챕터</option>
              {filterOptions.chapters.map((chapter) => (
                <option key={chapter.chapterCode} value={chapter.chapterCode}>
                  {chapter.chapterCode} ({chapter.chapterTitle})
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="노드 코드">
            <select
              value={filters.nodeCode}
              onChange={(e) => setFilters((p) => ({ ...p, nodeCode: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            >
              <option value="">전체 노드</option>
              {filterOptions.nodes.map((node) => (
                <option key={`${node.chapterCode}-${node.nodeCode}`} value={node.nodeCode}>
                  {node.nodeCode} ({node.chapterCode})
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Top N">
            <input
              type="number"
              value={filters.topN}
              min={5}
              max={50}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  topN: Number.isNaN(+e.target.value) ? 20 : +e.target.value,
                }))
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            />
          </FilterField>
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-400 mb-2">유저 검색/선택</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded border border-slate-700 bg-slate-900 p-2">
              <input
                value={userKeyword}
                onChange={(e) => setUserKeyword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                placeholder="이메일, 닉네임, userId 검색"
              />
              <div className="mt-2 max-h-40 overflow-auto border border-slate-800 rounded">
                {candidates.length === 0 ? (
                  <p className="text-xs text-slate-500 p-2">검색 결과 없음</p>
                ) : (
                  candidates.map((candidate) => (
                    <button
                      key={candidate.userId}
                      className="w-full text-left px-2 py-2 text-xs hover:bg-slate-800 border-b border-slate-800"
                      onClick={() => addUser(candidate)}
                      type="button"
                    >
                      #{candidate.userId} · {candidate.nickname ?? "닉네임없음"} · {candidate.email ?? "이메일없음"} · {candidate.role}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900 p-2">
              <p className="text-xs text-slate-400 mb-2">선택된 유저 ({selectedUsers.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.length === 0 ? (
                  <p className="text-xs text-slate-500">전체 유저 대상</p>
                ) : (
                  selectedUsers.map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => removeUser(user.userId)}
                      className="rounded-full bg-cyan-900/40 border border-cyan-700 text-cyan-200 text-xs px-3 py-1"
                    >
                      #{user.userId} {user.nickname ?? "-"} ×
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onApply} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-sm font-medium">
            필터 적용
          </button>
          <button onClick={onReset} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm font-medium">
            초기화
          </button>
          <button onClick={() => onQuickRange(1)} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">
            최근 24시간
          </button>
          <button onClick={() => onQuickRange(7)} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">
            최근 7일
          </button>
          <button onClick={() => onQuickRange(30)} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">
            최근 30일
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        <StatCard label="총 이벤트" value={data.overview.totalEvents} hint="선택 기간 내 로그 건수" />
        <StatCard label="성공/실패/오류" value={`${data.overview.successCount}/${data.overview.failCount}/${data.overview.errorCount}`} hint="result 기준" />
        <StatCard label="힌트 요청" value={data.overview.hintRequestedCount} hint="hint_requested=true" />
        <StatCard label="고유 유저" value={data.overview.uniqueUsers} hint="cardinality(user_id)" />
        <StatCard label="고유 세션" value={data.overview.uniqueSessions} hint="cardinality(session_id)" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <ChartCard title="일자별 요청/성공/실패/오류 추이">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="요청" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="성공" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="실패" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="오류" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="병목 노드 실패율 Top">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bottleneckData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="노드" stroke="#cbd5e1" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Legend />
              <Bar dataKey="실패율" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="실패 명령어 Top">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={commandFailData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="명령어" stroke="#cbd5e1" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Legend />
              <Bar dataKey="실패" fill="#ef4444" />
              <Bar dataKey="오류" fill="#fb7185" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="rounded-xl border border-slate-800/80 bg-[#0a1020] mb-6">
        <SectionHead title="병목 노드 테이블" subtitle="어디에서 많이 막히는지 노드 단위로 확인" />
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/90">
              <tr>
                <Th>챕터</Th>
                <Th>노드</Th>
                <Th>총 요청</Th>
                <Th>실패</Th>
                <Th>오류</Th>
                <Th>실패율(%)</Th>
              </tr>
            </thead>
            <tbody>
              {data.bottlenecks.map((row) => (
                <tr key={`${row.chapterCode}-${row.nodeCode}`} className="border-t border-slate-800/80">
                  <Td>{row.chapterCode}</Td>
                  <Td>{row.nodeCode}</Td>
                  <Td>{row.totalCount}</Td>
                  <Td>{row.failCount}</Td>
                  <Td>{row.errorCount}</Td>
                  <Td>{row.failRatePercent.toFixed(2)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800/80 bg-[#0a1020] mb-6">
        <SectionHead title="유저 상세 추적" subtitle="선택한 유저별 요청/성공/실패/명령어 사용을 함께 조회" />
        <div className="space-y-4 p-4">
          {data.userJourneys.length === 0 ? (
            <p className="text-sm text-slate-400">선택된 유저가 없거나, 조건에 맞는 로그가 없습니다.</p>
          ) : (
            data.userJourneys.map((journey) => (
              <div key={journey.user.userId} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <span className="font-semibold">#{journey.user.userId}</span>
                  <span>{journey.user.nickname ?? "닉네임 없음"}</span>
                  <span className="text-slate-300">{journey.user.email ?? "이메일 없음"}</span>
                  <span className="text-cyan-300">{journey.user.role}</span>
                  <span>최신 이벤트: {journey.summary.latestActionAt ?? "-"}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  <MiniStat label="총 요청" value={journey.summary.totalCount} />
                  <MiniStat label="성공/실패/오류" value={`${journey.summary.successCount}/${journey.summary.failCount}/${journey.summary.errorCount}`} />
                  <MiniStat label="힌트 요청" value={journey.summary.hintRequestedCount} />
                  <MiniStat label="고유 세션" value={journey.summary.uniqueSessions} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                  <div className="overflow-auto border border-slate-800 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900">
                        <tr>
                          <Th>노드</Th>
                          <Th>요청</Th>
                          <Th>성공</Th>
                          <Th>실패</Th>
                          <Th>오류</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {journey.nodeStats.map((node) => (
                          <tr key={`${journey.user.userId}-${node.nodeCode}`} className="border-t border-slate-800">
                            <Td>{node.nodeCode}</Td>
                            <Td>{node.totalCount}</Td>
                            <Td>{node.successCount}</Td>
                            <Td>{node.failCount}</Td>
                            <Td>{node.errorCount}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-auto border border-slate-800 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900">
                        <tr>
                          <Th>명령어</Th>
                          <Th>요청</Th>
                          <Th>성공</Th>
                          <Th>실패</Th>
                          <Th>오류</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {journey.commandStats.map((cmd) => (
                          <tr key={`${journey.user.userId}-${cmd.command}`} className="border-t border-slate-800">
                            <Td>
                              <code className="text-[11px]">{cmd.command}</code>
                            </Td>
                            <Td>{cmd.totalCount}</Td>
                            <Td>{cmd.successCount}</Td>
                            <Td>{cmd.failCount}</Td>
                            <Td>{cmd.errorCount}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {(selectedMode === "single" || selectedMode === "compare") && (
        <section className="rounded-xl border border-cyan-900/60 bg-[#0a1020] mb-6">
          <SectionHead
            title={selectedMode === "single" ? "노드 단일 추적" : "2명 노드 동기 비교"}
            subtitle="이전/다음 노드로 이동하면서 해당 노드의 행동 요약을 확인"
          />
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs disabled:opacity-40"
                disabled={trackNodeIndex <= 0}
                onClick={() => setTrackNodeIndex((p) => Math.max(0, p - 1))}
              >
                이전 노드
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs disabled:opacity-40"
                disabled={trackNodeCodes.length === 0 || trackNodeIndex >= trackNodeCodes.length - 1}
                onClick={() => setTrackNodeIndex((p) => Math.min(trackNodeCodes.length - 1, p + 1))}
              >
                다음 노드
              </button>
              <Badge
                label={
                  currentTrackNodeCode
                    ? `Node ${trackNodeIndex + 1}/${trackNodeCodes.length}: ${currentTrackNodeCode}`
                    : "추적 데이터 없음"
                }
                tone="info"
              />
            </div>

            {trackUsers.length > 0 && currentTrackNodeCode ? (
              <div className={`grid gap-3 ${selectedMode === "compare" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
                {trackUsers.map((u) => {
                  const summary = getNodeSummaryForUser(u.userId, currentTrackNodeCode);
                  return (
                    <div key={u.userId} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                        <span className="font-semibold">#{u.userId}</span>
                        <span>{u.nickname ?? "닉네임 없음"}</span>
                        <span className="text-slate-300">{u.email ?? "이메일 없음"}</span>
                      </div>
                      {summary ? (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            <MiniStat label="총 시도" value={summary.totalCount} />
                            <MiniStat label="성공" value={summary.successCount} />
                            <MiniStat label="실패" value={summary.failCount} />
                            <MiniStat label="오류" value={summary.errorCount} />
                          </div>
                          <div className="overflow-auto border border-slate-800 rounded">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-900">
                                <tr>
                                  <Th>행동</Th>
                                  <Th>입력</Th>
                                  <Th>요청</Th>
                                  <Th>성공</Th>
                                  <Th>실패</Th>
                                  <Th>오류</Th>
                                </tr>
                              </thead>
                              <tbody>
                                {summary.topActions.map((a, idx) => (
                                  <tr key={`${u.userId}-${currentTrackNodeCode}-${idx}`} className="border-t border-slate-800">
                                    <Td>{a.actionType}</Td>
                                    <Td>
                                      <code className="text-[11px]">{a.inputValue}</code>
                                    </Td>
                                    <Td>{a.totalCount}</Td>
                                    <Td>{a.successCount}</Td>
                                    <Td>{a.failCount}</Td>
                                    <Td>{a.errorCount}</Td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">해당 노드 로그가 없습니다.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">선택 조건에서 노드 추적 데이터가 없습니다.</p>
            )}
          </div>
        </section>
      )}

      {data.comparison.enabled && (
        <section className="rounded-xl border border-slate-800/80 bg-[#0a1020]">
          <SectionHead
            title="유저 2명 비교"
            subtitle={`#${data.comparison.leftUserId} vs #${data.comparison.rightUserId}`}
          />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <MiniStat
              label={`#${data.comparison.leftUserId} 성공/실패/오류`}
              value={`${data.comparison.leftSummary.successCount}/${data.comparison.leftSummary.failCount}/${data.comparison.leftSummary.errorCount}`}
            />
            <MiniStat
              label={`#${data.comparison.rightUserId} 성공/실패/오류`}
              value={`${data.comparison.rightSummary.successCount}/${data.comparison.rightSummary.failCount}/${data.comparison.rightSummary.errorCount}`}
            />
          </div>

          <div className="overflow-auto px-4 pb-4">
            <h3 className="text-sm font-semibold mb-2">노드별 비교</h3>
            <table className="w-full text-xs border border-slate-800">
              <thead className="bg-slate-900">
                <tr>
                  <Th>노드</Th>
                  <Th>좌 요청</Th>
                  <Th>좌 성공</Th>
                  <Th>좌 실패</Th>
                  <Th>우 요청</Th>
                  <Th>우 성공</Th>
                  <Th>우 실패</Th>
                </tr>
              </thead>
              <tbody>
                {data.comparison.nodeRows.map((row) => (
                  <tr key={row.nodeCode} className="border-t border-slate-800">
                    <Td>{row.nodeCode}</Td>
                    <Td>{row.leftTotal}</Td>
                    <Td>{row.leftSuccess}</Td>
                    <Td>{row.leftFail}</Td>
                    <Td>{row.rightTotal}</Td>
                    <Td>{row.rightSuccess}</Td>
                    <Td>{row.rightFail}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {children}
    </label>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-800/90 bg-[#0a1020] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/70 px-3 py-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0a1020] p-4">
      <h2 className="text-sm font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-4 py-3 border-b border-slate-800/80">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "ok" | "warn" | "info" | "neutral" }) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-700 text-emerald-300 bg-emerald-950/30"
      : tone === "warn"
        ? "border-amber-700 text-amber-300 bg-amber-950/30"
        : tone === "info"
          ? "border-cyan-700 text-cyan-300 bg-cyan-950/30"
          : "border-slate-700 text-slate-300 bg-slate-900/40";
  return <span className={`rounded-full border px-2 py-1 ${toneClass}`}>{label}</span>;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="text-left px-3 py-2.5 whitespace-nowrap text-slate-200 font-semibold">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2.5 whitespace-nowrap text-slate-100">{children}</td>;
}
