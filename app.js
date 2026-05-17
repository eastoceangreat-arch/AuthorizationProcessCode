const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  users: [],
  systems: [],
  assets: [],
  rules: [],
  requests: [],
  steps: [],
  grants: [],
  audits: [],
  actor: null,
  selectedRequestId: null,
  client: null,
  online: false,
};

const demo = {
  users: [
    { id: "u1", employee_no: "E10001", full_name: "张三", department: "销售一部", job_title: "区域经理", role_type: "employee", manager_id: "u2" },
    { id: "u2", employee_no: "E10002", full_name: "王五", department: "销售一部", job_title: "销售负责人", role_type: "manager" },
    { id: "u3", employee_no: "E20001", full_name: "李四", department: "IT部", job_title: "BI负责人", role_type: "system_owner" },
    { id: "u4", employee_no: "E30001", full_name: "赵六", department: "财务部", job_title: "财务数据Owner", role_type: "data_owner" },
    { id: "u5", employee_no: "E40001", full_name: "钱七", department: "内控部", job_title: "内控经理", role_type: "internal_control" },
    { id: "u6", employee_no: "E50001", full_name: "周八", department: "IT部", job_title: "权限管理员", role_type: "it_admin" },
  ],
  systems: [
    { id: "s1", code: "BI", name: "BI平台", business_domain: "经营分析", owner_id: "u3", data_owner_id: "u4" },
    { id: "s2", code: "WMS", name: "WMS", business_domain: "供应链仓储", owner_id: "u6", data_owner_id: "u4" },
    { id: "s3", code: "DMS", name: "DMS", business_domain: "销售/经销商", owner_id: "u6", data_owner_id: "u4" },
  ],
  assets: [
    { id: "a1", system_id: "s1", asset_type: "bi_report", name: "价格毛利明细", default_permission: "查看 + 明细导出", data_scope_template: "区域/渠道/品牌/客户", risk_level: "L4", allows_export: true, requires_expiry: true },
    { id: "a2", system_id: "s2", asset_type: "temporary_access", name: "库存调整", default_permission: "调整/审批", data_scope_template: "仓库", risk_level: "L3", allows_export: true, requires_expiry: true },
    { id: "a3", system_id: "s3", asset_type: "application_role", name: "价格维护", default_permission: "维护", data_scope_template: "区域/客户组", risk_level: "L3", allows_export: false, requires_expiry: false },
  ],
  rules: [
    { request_category: "BI报表权限", risk_level: "L4", step_order: 1, approver_role: "manager", sla_hours: 24 },
    { request_category: "BI报表权限", risk_level: "L4", step_order: 2, approver_role: "report_owner", sla_hours: 24 },
    { request_category: "BI报表权限", risk_level: "L4", step_order: 3, approver_role: "data_owner", sla_hours: 24 },
    { request_category: "BI报表权限", risk_level: "L4", step_order: 4, approver_role: "internal_control", sla_hours: 24 },
    { request_category: "BI报表权限", risk_level: "L4", step_order: 5, approver_role: "it_admin", sla_hours: 24 },
  ],
  requests: [],
  steps: [],
  grants: [],
  audits: [],
};

const titles = {
  dashboard: ["申请中心", "统一受理应用系统、BI、邮箱、共享盘和临时权限申请"],
  request: ["权限申请", "提交权限、数据范围、有效期和业务理由"],
  approval: ["审批处理", "按风险等级自动流转并记录审批意见"],
  ledger: ["权限台账", "查看已授权限、风险等级、到期时间和状态"],
  rules: ["流程规则", "维护风险分级、审批链和 SLA 原则"],
};

function configured() {
  const config = window.SUPABASE_CONFIG || {};
  return Boolean(config.url && config.publishableKey && window.supabase?.createClient);
}

async function select(table, order = "created_at") {
  const { data, error } = await state.client.from(table).select("*").order(order, { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadData() {
  if (configured()) {
    const { url, publishableKey } = window.SUPABASE_CONFIG;
    state.client = window.supabase.createClient(url, publishableKey);
    state.online = true;
    state.users = await select("app_users");
    state.systems = await select("permission_systems");
    state.assets = await select("permission_assets");
    state.rules = await select("approval_rules", "step_order");
    state.requests = await select("access_requests");
    state.steps = await select("approval_steps", "step_order");
    state.grants = await select("permission_grants", "granted_at");
    state.audits = await select("audit_logs");
  } else {
    Object.assign(state, structuredClone(demo));
  }
  state.actor = state.users[0];
  seedDemoRequest();
}

function seedDemoRequest() {
  if (state.requests.length) return;
  const requester = state.users[0];
  const system = state.systems[0];
  const asset = state.assets[0];
  const request = {
    id: "r-demo",
    request_no: "AR-20260517-001",
    requester_id: requester.id,
    category: "BI报表权限",
    request_type: "new",
    system_id: system.id,
    asset_id: asset.id,
    permission_name: asset.default_permission,
    data_scope: "华东大区 / 经销商渠道 / 价格毛利明细",
    business_reason: "负责区域经营复盘，需要查看并导出明细数据。",
    expected_completion: "normal",
    risk_level: "L4",
    need_export: true,
    expires_at: "2026-08-31",
    status: "in_approval",
    current_step: 1,
    created_at: new Date().toISOString(),
  };
  state.requests.push(request);
  state.steps.push({ id: "st-demo-1", request_id: request.id, step_order: 1, approver_role: "manager", approver_id: state.users[1].id, status: "active", due_at: new Date(Date.now() + 86400000).toISOString() });
}

function user(id) { return state.users.find((item) => item.id === id) || {}; }
function system(id) { return state.systems.find((item) => item.id === id) || {}; }
function asset(id) { return state.assets.find((item) => item.id === id) || {}; }
function category(assetRow) { return assetRow.asset_type === "bi_report" ? "BI报表权限" : assetRow.asset_type === "temporary_access" ? "临时权限" : "应用系统权限"; }
function roleName(role) {
  return { manager: "直属上级", department_head: "部门负责人", system_owner: "系统Owner", data_owner: "数据Owner", report_owner: "报表Owner", internal_control: "内控", it_admin: "权限管理员", requester_confirm: "申请人确认" }[role] || role;
}
function toast(text) {
  const node = $("#toast");
  node.textContent = text;
  node.classList.add("show");
  setTimeout(() => node.classList.remove("show"), 2600);
}

function renderOptions() {
  $("#actorSelect").innerHTML = state.users.map((u) => `<option value="${u.id}">${u.full_name} / ${u.job_title}</option>`).join("");
  $("#requester").innerHTML = state.users.map((u) => `<option value="${u.id}">${u.full_name} / ${u.department}</option>`).join("");
  $("#systemSelect").innerHTML = state.systems.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  updateAssetOptions();
}

function updateAssetOptions() {
  const systemId = $("#systemSelect").value || state.systems[0]?.id;
  const rows = state.assets.filter((a) => a.system_id === systemId);
  $("#assetSelect").innerHTML = rows.map((a) => `<option value="${a.id}">${a.name} / ${a.risk_level}</option>`).join("");
  fillAssetDefaults();
}

function fillAssetDefaults() {
  const selected = asset($("#assetSelect").value);
  if (!selected.id) return;
  $("#permissionName").value = selected.default_permission || "";
  $("#dataScope").value = selected.data_scope_template || "";
  $("#needExport").value = String(Boolean(selected.allows_export));
}

function renderMetrics() {
  $("#metricOpen").textContent = state.requests.filter((r) => !["completed", "rejected", "revoked"].includes(r.status)).length;
  $("#metricRisk").textContent = state.requests.filter((r) => ["L3", "L4", "L5"].includes(r.risk_level)).length;
  $("#metricGrant").textContent = state.grants.filter((g) => g.status !== "revoked").length;
  $("#metricAudit").textContent = state.audits.length;
  $("#connectionBadge").textContent = state.online ? "Supabase 已连接" : "本地演示";
  $("#connectionBadge").classList.toggle("muted", !state.online);
}

function requestCard(request) {
  const requester = user(request.requester_id);
  const sys = system(request.system_id);
  return `<article class="item" data-request="${request.id}"><div class="item-head"><strong>${request.request_no}</strong><span class="pill risk">${request.risk_level}</span></div><p>${requester.full_name || "申请人"} 申请 ${sys.name || "系统"}：${request.permission_name}</p><p>${request.status} / 当前第 ${request.current_step || 1} 步</p></article>`;
}

function renderDashboard() {
  $("#requestList").innerHTML = state.requests.length ? state.requests.map(requestCard).join("") : `<div class="item"><p>暂无申请</p></div>`;
}

function renderApproval() {
  $("#approvalQueue").innerHTML = state.requests.map(requestCard).join("") || `<div class="item"><p>暂无审批任务</p></div>`;
  renderApprovalDetail();
}

function renderApprovalDetail() {
  const request = state.requests.find((r) => r.id === state.selectedRequestId) || state.requests[0];
  if (!request) {
    $("#approvalDetail").className = "detail empty";
    $("#approvalDetail").textContent = "请选择一条申请";
    return;
  }
  state.selectedRequestId = request.id;
  const activeStep = state.steps.find((s) => s.request_id === request.id && s.status === "active");
  $("#approvalDetail").className = "detail";
  $("#approvalDetail").innerHTML = `<dl><dt>单号</dt><dd>${request.request_no}</dd><dt>申请人</dt><dd>${user(request.requester_id).full_name}</dd><dt>系统</dt><dd>${system(request.system_id).name}</dd><dt>权限</dt><dd>${request.permission_name}</dd><dt>范围</dt><dd>${request.data_scope}</dd><dt>风险</dt><dd>${request.risk_level}</dd><dt>当前节点</dt><dd>${activeStep ? roleName(activeStep.approver_role) : "无待办节点"}</dd><dt>业务原因</dt><dd>${request.business_reason}</dd></dl>`;
  $$("#approvalQueue .item").forEach((node) => node.classList.toggle("active", node.dataset.request === request.id));
}

function renderLedger() {
  const rows = state.grants.length ? state.grants : [{ user_id: state.users[0]?.id, system_id: state.systems[0]?.id, permission_name: "价格毛利明细查看", data_scope: "华东大区", risk_level: "L4", expires_at: "2026-08-31", status: "active" }];
  $("#grantRows").innerHTML = rows.map((g) => `<tr><td>${user(g.user_id).full_name || "-"}</td><td>${system(g.system_id).name || "-"}</td><td>${g.permission_name}</td><td>${g.data_scope}</td><td>${g.risk_level}</td><td>${g.expires_at || "长期"}</td><td><span class="pill done">${g.status}</span></td></tr>`).join("");
}

function renderRules() {
  const rows = state.rules.length ? state.rules : demo.rules;
  $("#ruleList").innerHTML = rows.map((r) => `<article class="item"><div class="item-head"><strong>${r.request_category}</strong><span class="pill risk">${r.risk_level}</span></div><p>第 ${r.step_order} 步：${roleName(r.approver_role)} / SLA ${r.sla_hours} 小时</p></article>`).join("");
}

function renderAll() {
  renderMetrics();
  renderDashboard();
  renderApproval();
  renderLedger();
  renderRules();
}

function approverFor(role, request) {
  if (role === "manager") return user(request.requester_id).manager_id || state.users.find((u) => u.role_type === "manager")?.id;
  if (role === "data_owner") return system(request.system_id).data_owner_id || state.users.find((u) => u.role_type === "data_owner")?.id;
  if (role === "system_owner" || role === "report_owner") return system(request.system_id).owner_id || state.users.find((u) => u.role_type === "system_owner")?.id;
  return state.users.find((u) => u.role_type === role)?.id || state.actor?.id;
}

async function save(table, payload) {
  if (!state.online) return { ...payload, id: payload.id || crypto.randomUUID() };
  const { data, error } = await state.client.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function update(table, id, payload) {
  if (!state.online) return;
  const { error } = await state.client.from(table).update(payload).eq("id", id);
  if (error) throw error;
}

async function submitRequest(event) {
  event.preventDefault();
  const selectedAsset = asset($("#assetSelect").value);
  const request = await save("access_requests", {
    request_no: `AR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(state.requests.length + 1).padStart(3, "0")}`,
    requester_id: $("#requester").value,
    category: category(selectedAsset),
    request_type: $("#requestType").value,
    system_id: $("#systemSelect").value,
    asset_id: selectedAsset.id,
    permission_name: $("#permissionName").value,
    data_scope: $("#dataScope").value,
    business_reason: $("#businessReason").value,
    expected_completion: "normal",
    risk_level: selectedAsset.risk_level || "L3",
    need_export: $("#needExport").value === "true",
    expires_at: $("#expiresAt").value || null,
    status: "in_approval",
    current_step: 1,
    submitted_at: new Date().toISOString(),
  });
  const rules = state.rules.filter((r) => r.request_category === request.category && r.risk_level === request.risk_level).sort((a, b) => a.step_order - b.step_order);
  for (const rule of rules) {
    const step = await save("approval_steps", { request_id: request.id, step_order: rule.step_order, approver_role: rule.approver_role, approver_id: approverFor(rule.approver_role, request), status: rule.step_order === 1 ? "active" : "pending", due_at: new Date(Date.now() + rule.sla_hours * 3600000).toISOString() });
    state.steps.push(step);
  }
  const log = await save("audit_logs", { request_id: request.id, actor_id: state.actor.id, action: "submit", entity_type: "access_request", entity_id: request.id, detail: { request_no: request.request_no } });
  state.requests.push(request);
  state.audits.push(log);
  state.selectedRequestId = request.id;
  renderAll();
  showPage("approval");
  toast("申请已提交并进入审批流");
}

async function decide(approved) {
  const request = state.requests.find((r) => r.id === state.selectedRequestId) || state.requests[0];
  if (!request) return;
  const step = state.steps.find((s) => s.request_id === request.id && s.status === "active");
  if (!step) return toast("当前没有待审批节点");
  await update("approval_steps", step.id, { status: approved ? "approved" : "rejected", decision_comment: $("#decisionComment").value, decided_at: new Date().toISOString() });
  step.status = approved ? "approved" : "rejected";
  step.decision_comment = $("#decisionComment").value;
  if (!approved) {
    await update("access_requests", request.id, { status: "rejected" });
    request.status = "rejected";
    toast("申请已驳回");
  } else {
    const next = state.steps.filter((s) => s.request_id === request.id && s.status === "pending").sort((a, b) => a.step_order - b.step_order)[0];
    if (next) {
      await update("approval_steps", next.id, { status: "active" });
      await update("access_requests", request.id, { current_step: next.step_order });
      next.status = "active";
      request.current_step = next.step_order;
      toast("审批通过，已流转到下一节点");
    } else {
      await update("access_requests", request.id, { status: "completed", completed_at: new Date().toISOString() });
      const grant = await save("permission_grants", { request_id: request.id, user_id: request.requester_id, system_id: request.system_id, asset_id: request.asset_id, permission_name: request.permission_name, data_scope: request.data_scope, risk_level: request.risk_level, granted_by: state.actor.id, expires_at: request.expires_at, status: "active" });
      request.status = "completed";
      state.grants.push(grant);
      toast("全部审批完成，权限已进入台账");
    }
  }
  const log = await save("audit_logs", { request_id: request.id, actor_id: state.actor.id, action: approved ? "approve" : "reject", entity_type: "approval_step", entity_id: step.id, detail: { comment: $("#decisionComment").value } });
  state.audits.push(log);
  $("#decisionComment").value = "";
  renderAll();
}

function showPage(id) {
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === id));
  $$(".nav").forEach((button) => button.classList.toggle("active", button.dataset.page === id));
  $("#pageTitle").textContent = titles[id][0];
  $("#pageSubTitle").textContent = titles[id][1];
}

async function init() {
  try {
    await loadData();
    renderOptions();
    renderAll();
    toast(state.online ? "已连接 Supabase" : "当前使用本地演示数据");
  } catch (error) {
    console.error(error);
    Object.assign(state, structuredClone(demo));
    state.actor = state.users[0];
    seedDemoRequest();
    renderOptions();
    renderAll();
    toast("Supabase 连接失败，已切换本地演示");
  }
  $$(".nav").forEach((button) => button.addEventListener("click", () => showPage(button.dataset.page)));
  $("#actorSelect").addEventListener("change", (event) => { state.actor = user(event.target.value); toast(`当前身份：${state.actor.full_name}`); });
  $("#systemSelect").addEventListener("change", updateAssetOptions);
  $("#assetSelect").addEventListener("change", fillAssetDefaults);
  $("#requestForm").addEventListener("submit", submitRequest);
  $("#approvalQueue").addEventListener("click", (event) => { const item = event.target.closest(".item[data-request]"); if (item) { state.selectedRequestId = item.dataset.request; renderApprovalDetail(); } });
  $("#approveBtn").addEventListener("click", () => decide(true));
  $("#rejectBtn").addEventListener("click", () => decide(false));
}

init();
