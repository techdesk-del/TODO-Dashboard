const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>UrbanGaon Workspace — Executive Architecture & Flow Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.55;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      padding: 0;
      page-break-after: always;
      position: relative;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .no-break {
      page-break-inside: avoid;
    }

    /* Cover Page */
    .cover-container {
      height: 260mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px;
      background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
      position: relative;
      overflow: hidden;
    }

    .cover-decoration {
      position: absolute;
      top: 0;
      right: 0;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(255,255,255,0) 70%);
      pointer-events: none;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      color: #1d4ed8;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .cover-title {
      font-size: 30pt;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.15;
      letter-spacing: -0.8px;
      margin-bottom: 12px;
    }

    .cover-subtitle {
      font-size: 14pt;
      font-weight: 500;
      color: #475569;
      line-height: 1.45;
      margin-bottom: 30px;
      max-width: 90%;
    }

    .cover-highlights {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 20px;
    }

    .highlight-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .highlight-card .number {
      font-size: 20pt;
      font-weight: 800;
      color: #2563eb;
      margin-bottom: 4px;
    }

    .highlight-card .label {
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cover-meta {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .meta-group h4 {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      margin-bottom: 4px;
      font-weight: 700;
    }

    .meta-group p {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
    }

    .meta-group span {
      font-size: 9pt;
      color: #64748b;
      font-weight: 400;
    }

    /* Standard Pages Header & Footer */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 22px;
    }

    .page-header .brand {
      font-size: 9pt;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-header .doc-tag {
      font-size: 8pt;
      font-weight: 600;
      color: #64748b;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .page-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 8pt;
      color: #94a3b8;
    }

    /* Headings */
    h1 {
      font-size: 19pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      margin-bottom: 8px;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h2 .section-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #2563eb;
      color: white;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 800;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      color: #475569;
      margin-bottom: 12px;
      font-size: 10pt;
      line-height: 1.6;
    }

    .lead-p {
      font-size: 10.5pt;
      color: #334155;
      font-weight: 500;
      line-height: 1.65;
    }

    /* Executive Callout Boxes */
    .callout {
      border-left: 4px solid #2563eb;
      background: #eff6ff;
      border-radius: 0 10px 10px 0;
      padding: 12px 16px;
      margin: 14px 0;
    }

    .callout.success {
      border-left-color: #10b981;
      background: #f0fdf4;
    }

    .callout.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }

    .callout h4 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 4px;
    }

    .callout.success h4 { color: #065f46; }
    .callout.warning h4 { color: #92400e; }

    .callout p {
      font-size: 9pt;
      margin-bottom: 0;
      color: #334155;
    }

    /* Cards & Grids */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin: 12px 0;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 12px 0;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 12px 0;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
    }

    .card.accent {
      border-top: 3px solid #2563eb;
    }

    .card h4 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card p {
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 0;
      line-height: 1.5;
    }

    /* Process Flow Diagram */
    .workflow-container {
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .workflow-step {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      position: relative;
    }

    .workflow-step .step-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 10pt;
      color: white;
      shrink-0;
    }

    .step-1-color { background: #2563eb; }
    .step-2-color { background: #0284c7; }
    .step-3-color { background: #d97706; }
    .step-4-color { background: #059669; }
    .step-5-color { background: #7c3aed; }

    .workflow-step .step-content {
      flex: 1;
    }

    .workflow-step .step-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .workflow-step .step-desc {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.45;
      margin: 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }

    thead tr {
      background-color: #0f172a;
      color: #ffffff;
    }

    th {
      padding: 8px 10px;
      font-weight: 600;
      text-align: left;
      font-size: 8pt;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-green { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-rose { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
    .badge-purple { background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff; }

    /* Bullet List */
    ul.check-list {
      list-style: none;
      padding: 0;
      margin: 8px 0;
    }

    ul.check-list li {
      position: relative;
      padding-left: 20px;
      margin-bottom: 6px;
      font-size: 9pt;
      color: #334155;
      line-height: 1.5;
    }

    ul.check-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      top: 0;
      color: #10b981;
      font-weight: 800;
    }

    /* Metrics Ribbon */
    .kpi-ribbon {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 14px 0;
    }

    .kpi-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }

    .kpi-box .val {
      font-size: 16pt;
      font-weight: 900;
      color: #0f172a;
    }

    .kpi-box .sub {
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: COVER PAGE ==================== -->
  <div class="page">
    <div class="cover-container">
      <div class="cover-decoration"></div>
      
      <div>
        <div class="cover-badge">
          <span>🏢 UrbanGaon Technologies — Executive Briefing</span>
        </div>
        <h1 class="cover-title">
          Real-Time Workforce & Task Operations Dashboard
        </h1>
        <p class="cover-subtitle">
          Complete Operational Architecture, Workflow Guide & Strategic Value Manual for Leadership.
        </p>

        <div class="cover-highlights">
          <div class="highlight-card">
            <div class="number">100%</div>
            <div class="label">Operational Transparency</div>
          </div>
          <div class="highlight-card">
            <div class="number">Real-Time</div>
            <div class="label">Instant Multi-PC Sync</div>
          </div>
          <div class="highlight-card">
            <div class="number">EOD Audit</div>
            <div class="label">Zero Blind Spots Daily</div>
          </div>
        </div>
      </div>

      <div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; margin-bottom: 20px;">
          <h4 style="font-size: 10pt; text-transform: uppercase; color: #2563eb; font-weight: 800; margin-bottom: 8px; letter-spacing: 0.5px;">Document Purpose & Executive Overview</h4>
          <p style="font-size: 10pt; color: #334155; margin: 0; line-height: 1.65;">
            This executive documentation details how the UrbanGaon Task & Productivity Platform operates end-to-end. Written in straightforward, business-focused language, it outlines how team tasks are created, tracked, audited, and closed each day, empowering the CEO with total workforce visibility, real-time command, and automated daily accountability.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <h5 style="font-size: 9pt; font-weight: 700; color: #0f172a; margin-bottom: 4px;">⚡ Real-Time Architecture</h5>
            <p style="font-size: 8.5pt; color: #64748b; margin: 0; line-height: 1.5;">Instant multi-PC synchronization across all screens with zero page refreshes or manual updates.</p>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <h5 style="font-size: 9pt; font-weight: 700; color: #0f172a; margin-bottom: 4px;">📊 360° Executive Radar</h5>
            <p style="font-size: 8.5pt; color: #64748b; margin: 0; line-height: 1.5;">Direct status control, daily EOD inspection, book reading metrics, and 1-click corporate exports.</p>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ==================== PAGE 2: EXECUTIVE SUMMARY & PHILOSOPHY ==================== -->
  <div class="page" style="padding-top: 10px;">
    <div class="page-header">
      <div class="brand">UrbanGaon Workspace • Executive Documentation</div>
      <div class="doc-tag">Section 1 & 2 • Core Philosophy & Architecture</div>
    </div>

    <h1>1. Executive Summary: Why This System Exists</h1>
    <p class="lead-p">
      In fast-scaling companies, operational friction occurs not from a lack of talent, but from <strong>fragmented communication, unaligned priorities, and invisible daily bottlenecks</strong>.
    </p>

    <div class="callout">
      <h4>The Problem Solved</h4>
      <p>
        Before this platform, daily work was scattered across informal chats, WhatsApp groups, oral standup conversations, and disparate sheets. Leaders had to constantly ask <em>"What is the status of X?"</em> and <em>"What did we accomplish today?"</em>. Blockers were often discovered days late.
      </p>
    </div>

    <p>
      The <strong>UrbanGaon Real-Time Task Dashboard</strong> was engineered to establish a <strong>single source of truth</strong> across all departments. Every single commitment, daily assignment, intellectual milestone, and end-of-day summary is visible in real-time without needing a single status meeting.
    </p>

    <div class="kpi-ribbon">
      <div class="kpi-box">
        <div class="val" style="color: #2563eb;">9</div>
        <div class="sub">Active Members</div>
      </div>
      <div class="kpi-box">
        <div class="val" style="color: #059669;">100%</div>
        <div class="sub">Live Visibility</div>
      </div>
      <div class="kpi-box">
        <div class="val" style="color: #d97706;">0</div>
        <div class="sub">Manual Refresh</div>
      </div>
      <div class="kpi-box">
        <div class="val" style="color: #7c3aed;">Daily</div>
        <div class="sub">EOD Checkout</div>
      </div>
    </div>

    <h2 style="margin-top: 24px;"><span class="section-num">2</span> User Roles & Permission Hierarchy</h2>
    <p>
      To balance transparency with focus, the platform implements an executive role model designed around operational accountability:
    </p>

    <div class="grid-2 no-break">
      <div class="card accent">
        <h4>👑 Executive & Leadership Tier (CEO & Management)</h4>
        <p style="margin-bottom: 8px;"><strong>Scope:</strong> Company-wide strategic oversight and operations management</p>
        <ul class="check-list">
          <li><strong>360° Company-Wide Radar:</strong> Full visibility into all 9 team members' tasks, workloads, and real-time statuses.</li>
          <li><strong>Direct Intervention:</strong> Change status, reassign priorities, edit deadlines, or delete stalled items directly from the command matrix.</li>
          <li><strong>Workforce Performance Audit:</strong> Daily inspection of EOD ratings, logged hours, and pending task blockers.</li>
          <li><strong>Instant Board-Ready Exports:</strong> Download customized PDF & CSV executive workforce summaries in 1 click.</li>
        </ul>
      </div>

      <div class="card accent" style="border-top-color: #10b981;">
        <h4>👤 Team Member Tier (Departmental Execution)</h4>
        <p style="margin-bottom: 8px;"><strong>Scope:</strong> Cross-functional team members and departmental execution</p>
        <ul class="check-list">
          <li><strong>Focused Workstation:</strong> High-clarity Kanban view prioritized by urgency and due date.</li>
          <li><strong>Privacy Protection:</strong> Built-in privacy guard prevents peers from cross-tampering or viewing private tasks without authorization.</li>
          <li><strong>Daily Habit Building:</strong> Native Book Reading tracker with daily page check-ins and takeaway journaling.</li>
          <li><strong>Closing Accountability:</strong> Mandatory EOD Checkout modal to log accomplishments, tomorrow's plan, and day rating.</li>
        </ul>
      </div>
    </div>

    <div class="callout success no-break" style="margin-top: 14px;">
      <h4>Security & Presence Tracking</h4>
      <p>
        Access is secured via <strong>individual PIN authentication</strong>. The platform automatically detects active presence: team members actively working display a <strong>🟢 Active Now</strong> pulsing indicator, while those who have completed their daily checkout display <strong>🏠 Clocked Out</strong>.
      </p>
    </div>

  </div>

  <!-- ==================== PAGE 3: END-TO-END APPLICATION WORKFLOW ==================== -->
  <div class="page" style="padding-top: 10px;">
    <div class="page-header">
      <div class="brand">UrbanGaon Workspace • Executive Documentation</div>
      <div class="doc-tag">Section 3 • End-to-End Application Flow</div>
    </div>

    <h1>3. End-to-End Operational Workflow</h1>
    <p class="lead-p">
      The platform functions like an automated assembly line for company operations. Every task progresses through 5 transparent stages from creation to closure:
    </p>

    <div class="workflow-container">
      
      <!-- Step 1 -->
      <div class="workflow-step no-break">
        <div class="step-icon step-1-color">1</div>
        <div class="step-content">
          <div class="step-title">Stage 1: Task Origination & Delegation (Create Task)</div>
          <div class="step-desc">
            Leadership or team members click <strong>"+ Create Task"</strong>. The creator specifies:
            <strong>Title & Description</strong>, <strong>Assignee</strong> (any team member), <strong>Priority</strong> (Urgent / High / Medium / Low), <strong>Due Date</strong>, <strong>Tags</strong>, and <strong>Subtasks checklist</strong>. The assignee's screen updates instantly via live websockets with an audio chime.
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="workflow-step no-break">
        <div class="step-icon step-2-color">2</div>
        <div class="step-content">
          <div class="step-title">Stage 2: Active Kanban Workflow (Drag & Drop Progression)</div>
          <div class="step-desc">
            Tasks live on an interactive 4-stage Kanban Board. Team members drag and drop cards as their work evolves:
            <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;">
              <span class="badge badge-blue">1. To Do (Backlog/Ready)</span>
              <span class="badge badge-amber">2. In Progress (Active Work)</span>
              <span class="badge badge-rose">3. Blocked (Needs CEO/Help)</span>
              <span class="badge badge-green">4. Completed (Delivered ✓)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="workflow-step no-break">
        <div class="step-icon step-3-color">3</div>
        <div class="step-content">
          <div class="step-title">Stage 3: In-Task Remarks & Discussion (Zero Communication Loss)</div>
          <div class="step-desc">
            Instead of discussing tasks on WhatsApp, members click the <strong>💬 Remarks</strong> button on any task card. Updates, client feedbacks, links, and roadblocks are logged with author avatar and timestamp. This creates an immutable permanent audit trail right inside the card.
          </div>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="workflow-step no-break">
        <div class="step-icon step-4-color">4</div>
        <div class="step-content">
          <div class="step-title">Stage 4: Automated Overdue Detection & Calendar Scheduling</div>
          <div class="step-desc">
            If a task passes its due date without completion, the platform automatically flags it with a bright 
            <span class="badge badge-rose">🔥 Overdue</span> banner and elevates it to the top of both the team board and the CEO Dashboard. Leaders can switch to <strong>Calendar View</strong> to see monthly sprint deadlines at a glance.
          </div>
        </div>
      </div>

      <!-- Step 5 -->
      <div class="workflow-step no-break">
        <div class="step-icon step-5-color">5</div>
        <div class="step-content">
          <div class="step-title">Stage 5: Celebration & Real-Time Broadcasting</div>
          <div class="step-desc">
            When a task is dragged to <strong>Completed</strong>, an instant celebratory confetti animation fires, an accomplishment chime sounds, and the live company-wide activity log broadcasts the completion. Sprint velocity numbers recalculate in real-time.
          </div>
        </div>
      </div>

    </div>

    <h3 style="margin-top: 14px;">Summary of Task Status Definitions</h3>
    <table>
      <thead>
        <tr>
          <th>Column Status</th>
          <th>Business Meaning</th>
          <th>What The CEO Sees</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-blue">To Do</span></td>
          <td>Assigned work waiting in queue. Estimated hours established.</td>
          <td>Planned capacity for the upcoming days.</td>
        </tr>
        <tr>
          <td><span class="badge badge-amber">In Progress</span></td>
          <td>Work actively being produced during office hours.</td>
          <td>What each team member is executing right now.</td>
        </tr>
        <tr>
          <td><span class="badge badge-rose">Blocked</span></td>
          <td>Work stopped due to dependency, approval, or technical blocker.</td>
          <td>Immediate intervention point for CEO/Management.</td>
        </tr>
        <tr>
          <td><span class="badge badge-green">Completed</span></td>
          <td>Finished work verified by assignee. Logged with timestamp.</td>
          <td>Measurable output contributing to company sprint goal.</td>
        </tr>
      </tbody>
    </table>

  </div>

  <!-- ==================== PAGE 4: BOOK READING & EOD CHECKOUT ==================== -->
  <div class="page" style="padding-top: 10px;">
    <div class="page-header">
      <div class="brand">UrbanGaon Workspace • Executive Documentation</div>
      <div class="doc-tag">Section 4 & 5 • Daily Learning & EOD Checkout</div>
    </div>

    <h1>4. Intellectual Growth: Daily Book Reading Engine</h1>
    <p class="lead-p">
      A foundational pillar of UrbanGaon's culture is continuous learning. Rather than treating professional reading as an afterthought, the platform bakes book tracking directly into the daily workflow.
    </p>

    <div class="grid-2 no-break">
      <div class="card">
        <h4>📖 Member Daily Check-In</h4>
        <p style="margin-bottom: 6px;">Each team member has a dedicated book workspace where they:</p>
        <ul class="check-list">
          <li>Register their current reading book, author, and total page count.</li>
          <li>Log daily reading sessions with exact pages completed today (e.g. <em>+25 pages</em>).</li>
          <li>Write <strong>Key Takeaways & Business Insights</strong> derived from the chapter.</li>
          <li>Mark books as <strong>Presented</strong> once shared with the wider team.</li>
        </ul>
      </div>

      <div class="card">
        <h4>📊 CEO Reading Command Matrix</h4>
        <p style="margin-bottom: 6px;">The CEO Dashboard features a 6-metric reading dashboard showing:</p>
        <ul class="check-list">
          <li><strong>Today's Velocity:</strong> Exactly how many members read today and total pages read.</li>
          <li><strong>Company Progress:</strong> Total books completed, in progress, and presented.</li>
          <li><strong>Member Breakdown:</strong> Visual progress bars showing % completed per person.</li>
          <li><strong>Reading Log Audit:</strong> 1-click modal to read every member's daily insights history.</li>
        </ul>
      </div>
    </div>

    <h2 style="margin-top: 24px;"><span class="section-num">5</span> Daily EOD Checkout: Total Accountability</h2>
    <p class="lead-p">
      At the end of the working day, team members do not simply close their laptops. They complete an <strong>End-Of-Day (EOD) Digital Checkout</strong>.
    </p>

    <div class="callout warning no-break">
      <h4>How EOD Checkout Works in 4 Steps:</h4>
      <p>
        <strong>1. Task Auto-Aggregation:</strong> The system automatically extracts all tasks completed today vs tasks still pending.<br>
        <strong>2. Pending Task Explanations:</strong> For every unfinished task, the member writes the exact reason and their morning plan for tomorrow.<br>
        <strong>3. Blocker & Hours Logging:</strong> The member specifies any blockers encountered and logs their total working hours.<br>
        <strong>4. Day Rating & Sign-Off:</strong> The member rates their daily productivity from 1 to 5 stars ⭐ and submits.
      </p>
    </div>

    <div class="grid-3 no-break" style="margin-top: 14px;">
      <div class="card accent" style="border-top-color: #10b981;">
        <h4 style="color: #047857;">For The Member</h4>
        <p>Provides mental closure at the end of the day, sets clear priorities for tomorrow morning, and documents hard work objectively.</p>
      </div>
      <div class="card accent" style="border-top-color: #2563eb;">
        <h4 style="color: #1d4ed8;">For The CEO</h4>
        <p>Instant morning or evening digest of who delivered, who is struggling with blockers, and total hours worked across the company.</p>
      </div>
      <div class="card accent" style="border-top-color: #7c3aed;">
        <h4 style="color: #6b21a8;">Historical Archive</h4>
        <p>All past EOD reports are stored permanently. Searchable by date and exportable to CSV/PDF for appraisal reviews.</p>
      </div>
    </div>

  </div>

  <!-- ==================== PAGE 5: CEO COMMAND CENTER ==================== -->
  <div class="page" style="padding-top: 10px;">
    <div class="page-header">
      <div class="brand">UrbanGaon Workspace • Executive Documentation</div>
      <div class="doc-tag">Section 6 • The CEO Executive Command Center</div>
    </div>

    <h1>6. The CEO Command Center: Complete Control</h1>
    <p class="lead-p">
      By clicking <strong>"Executive Command"</strong> on the top navigation, the CEO enters a bird's-eye management cockpit tailored exclusively for executive decision-making.
    </p>

    <div class="kpi-ribbon no-break">
      <div class="kpi-box">
        <div class="val">9 / 9</div>
        <div class="sub">Workforce Headcount</div>
      </div>
      <div class="kpi-box">
        <div class="val" style="color: #d97706;">Live</div>
        <div class="sub">Active Pending Work</div>
      </div>
      <div class="kpi-box">
        <div class="val" style="color: #2563eb;">% Done</div>
        <div class="sub">Sprint Completion Rate</div>
      </div>
      <div class="kpi-box">
        <div class="val" style="color: #7c3aed;">⭐ 5.0</div>
        <div class="sub">Average Day Rating</div>
      </div>
    </div>

    <h2>Executive Matrix Modules At A Glance</h2>

    <div class="grid-2 no-break">
      <div class="card">
        <h4 style="color: #1d4ed8;">📋 1. Master Task Control Matrix</h4>
        <p style="margin-bottom: 6px;">
          Displays every task across all 9 members in a searchable, filterable table.
        </p>
        <ul class="check-list">
          <li><strong>Direct Status Override:</strong> Dropdown to immediately mark any task To Do, In Progress, Blocked, or Completed without opening modals.</li>
          <li><strong>Overdue Filter:</strong> 1-click tab to isolate all delayed items across the entire company.</li>
          <li><strong>Member Filtering:</strong> Select any team member to see only their current commitments.</li>
          <li><strong>Inline Remarking:</strong> Add executive instructions or remarks directly into any card.</li>
        </ul>
      </div>

      <div class="card">
        <h4 style="color: #047857;">👥 2. Team Workload & Attendance Table</h4>
        <p style="margin-bottom: 6px;">
          Summary table breaking down each team member's operational standing for the selected date.
        </p>
        <ul class="check-list">
          <li><strong>Presence Status:</strong> Real-time indicator (Active Now / Clocked Out / Offline).</li>
          <li><strong>Task Breakdown:</strong> Count of completed vs pending tasks today.</li>
          <li><strong>EOD Audit Button:</strong> Direct button to inspect the full EOD submission, hours, and blockers.</li>
          <li><strong>Open Board Shortcut:</strong> Instantly opens that member's personal Kanban board with full view.</li>
        </ul>
      </div>
    </div>

    <div class="grid-2 no-break" style="margin-top: 10px;">
      <div class="card">
        <h4 style="color: #b45309;">📑 3. One-Click PDF Executive Report</h4>
        <p>
          Generates a clean, branded PDF report summarizing company performance, task counts, hours logged, and attendance for any selected date. Ready for meetings, records, or board members.
        </p>
      </div>

      <div class="card">
        <h4 style="color: #0284c7;">📊 4. One-Click Excel / CSV Export</h4>
        <p>
          Exports complete raw tabular data with member names, task metrics, and EOD compliance into CSV format for deep analysis in Google Sheets or Microsoft Excel.
        </p>
      </div>
    </div>

    <div class="callout no-break" style="margin-top: 14px;">
      <h4>Executive Benefit: Zero Operational Surprises</h4>
      <p>
        The CEO can open this dashboard at <strong>9:30 AM</strong> to review the day's commitments, at <strong>2:30 PM</strong> to check progress and unblock stalled tasks, and at <strong>6:30 PM</strong> to review completed EOD reports. Total oversight requires less than 5 minutes a day.
      </p>
    </div>

  </div>

  <!-- ==================== PAGE 6: ARCHITECTURE & BUSINESS ROI ==================== -->
  <div class="page" style="padding-top: 10px;">
    <div class="page-header">
      <div class="brand">UrbanGaon Workspace • Executive Documentation</div>
      <div class="doc-tag">Section 7 & 8 • Tech Stability & Leadership ROI</div>
    </div>

    <h1>7. System Stability (Non-Technical Summary)</h1>
    <p class="lead-p">
      The platform is built on enterprise-grade web foundations optimized for speed, reliability, and data protection:
    </p>

    <div class="grid-3 no-break">
      <div class="card">
        <h4>⚡ Live Socket.IO Mesh</h4>
        <p>Updates appear instantaneously across all devices. When an employee moves a card, it moves on the CEO's screen in 100 milliseconds without refreshing.</p>
      </div>
      <div class="card">
        <h4>🛡️ Crash-Proof MongoDB</h4>
        <p>Robust database storage with auto-healing crash guards. Even if internet fluctuates, user changes are buffered safely and synced.</p>
      </div>
      <div class="card">
        <h4>📜 Immutable Activity Log</h4>
        <p>Every single creation, deletion, status shift, and checkout is timestamped in a live audit trail. Nothing can be changed without a record.</p>
      </div>
    </div>

    <h2 style="margin-top: 22px;"><span class="section-num">8</span> Strategic ROI for UrbanGaon Leadership</h2>

    <table>
      <thead>
        <tr>
          <th>Business Metric</th>
          <th>Traditional Workplace</th>
          <th>With UrbanGaon Task Dashboard</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Status Reporting</strong></td>
          <td>30-45 min wasted daily in meetings & chats</td>
          <td><strong>0 minutes</strong> — Dashboard is always live & up-to-date</td>
        </tr>
        <tr>
          <td><strong>Blocker Resolution</strong></td>
          <td>Discovered 2-3 days late during reviews</td>
          <td><strong>Immediate</strong> — Flagged in Red on the CEO screen</td>
        </tr>
        <tr>
          <td><strong>Daily Accountability</strong></td>
          <td>Vague, subjective, memory-based</td>
          <td><strong>Objective</strong> — Mandatory EOD checkout with ratings</td>
        </tr>
        <tr>
          <td><strong>Team Culture & Learning</strong></td>
          <td>Reading recommended but untracked</td>
          <td><strong>Integrated</strong> — Daily page logging & team presentations</td>
        </tr>
        <tr>
          <td><strong>Leadership Oversight</strong></td>
          <td>Micromanagement required</td>
          <td><strong>Effortless</strong> — High-level command with 1-click drill-down</td>
        </tr>
      </tbody>
    </table>

    <div class="callout success no-break" style="margin-top: 18px;">
      <h4 style="font-size: 10pt;">Conclusion & Executive Summary</h4>
      <p style="font-size: 9pt; line-height: 1.6;">
        The UrbanGaon Task Dashboard transforms daily operations from reactive management into a disciplined, high-velocity machine. It provides team members with clarity and autonomy, while providing the CEO with total control, peace of mind, and measurable proof of daily progress.
      </p>
    </div>
  </div>

</body>
</html>`;

const htmlFilePath = path.join(__dirname, 'UrbanGaon_Executive_Guide.html');
const pdfFilePath = path.join(__dirname, 'UrbanGaon_TODO_App_Executive_Documentation.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log('HTML file written successfully:', htmlFilePath);

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let browserPath = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

if (!browserPath) {
  console.error('No supported browser found for PDF conversion.');
  process.exit(1);
}

console.log('Using browser for PDF generation:', browserPath);

// Run headless browser with print-to-pdf
const fileUrl = 'file:///' + htmlFilePath.replace(/\\/g, '/');
const cmd = `"${browserPath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "${fileUrl}"`;

console.log('Running PDF conversion command...');
try {
  execSync(cmd, { stdio: 'inherit', timeout: 30000 });
  if (fs.existsSync(pdfFilePath)) {
    const stats = fs.statSync(pdfFilePath);
    console.log(`SUCCESS! PDF generated successfully: ${pdfFilePath} (${stats.size} bytes)`);
  } else {
    console.error('PDF file was not created.');
    process.exit(1);
  }
} catch (err) {
  console.error('Error generating PDF:', err.message);
  process.exit(1);
}
