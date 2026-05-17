# 权限申请与审批流程系统

这是一个根据 Figma 页面设计实现的权限治理流程原型，覆盖权限申请、审批流转、权限台账、SLA/风险规则和审计日志。

## 功能范围

- 权限申请中心：应用系统、BI、邮箱、共享盘、临时权限、权限回收/变更。
- 权限申请表单：申请人信息、系统/资产、权限、数据范围、业务原因、有效期。
- 审批处理页：查看申请详情、风险分析、审批链、审批意见。
- 权限台账与监控：授权记录、风险等级、到期时间、Owner、整改状态。
- 流程规则配置：风险分级、审批链、SLA、自动回收规则。
- Supabase 数据库：申请单、审批步骤、授权台账、审计日志。

## 文件结构

```text
index.html
styles.css
app.js
supabase-config.js
supabase-config.example.js
supabase/migrations/202605170001_permission_workflow.sql
```

## 本地预览

可以直接打开 `index.html`。如果需要通过本地服务预览：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

## Supabase 初始化

当前项目已在 Supabase 项目 `lepqplkdtnbckizhrfke` 中执行过迁移。若需要在新环境重新初始化，可在 Supabase SQL Editor 中执行：

```text
supabase/migrations/202605170001_permission_workflow.sql
```

复制配置文件：

```bash
cp supabase-config.example.js supabase-config.js
```

3. 在 `supabase-config.js` 中填入：

```js
window.SUPABASE_CONFIG = {
  url: "https://your-project-ref.supabase.co",
  publishableKey: "sb_publishable_xxx_or_legacy_anon_key",
};
```

配置完成后，前端会自动切换到 Supabase 读写。未配置时会使用浏览器本地演示数据。

## 安全说明

当前迁移脚本包含 demo RLS policy，允许 `anon` 和 `authenticated` 角色读写流程表，便于原型演示和快速验证。正式上线前应改成基于 Supabase Auth 的策略：

- 申请人只能查看和提交自己的申请。
- 审批人只能处理分配给自己的审批节点。
- 权限管理员可执行授权和回收。
- 内控/审计可查看审计日志。
- 前端只能使用 publishable key，不能暴露 service role key。

## GitHub 发布

代码已准备发布到：

```text
eastoceangreat-arch/AuthorizationProcessCode
```
