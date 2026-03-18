// ⬡B:AOA:code_path_map:20260318⬡
// Maps brain entry patterns to exact code paths, files, functions, and how to stop them.
// This is the "receipts" layer. When trace finds a brain entry, this tells you WHY.

const CODE_PATHS = {
  // MARS pipeline emails
  mars_pipeline: {
    trigger: 'OMI pendant captured a completed memory (meeting ended)',
    chain: [
      'OMI device → /api/omi/webhook (worker.js)',
      'Webhook fires MARSRealtime.processCompletedMemory() in background',
      'Haiku classifies transcript: type + significance + COOK tasks',
      'MARS report generated (executive summary, decisions, action items)',
      'sendMARSEmail() sends via Claudette Nylas grant',
      'COOK tasks assigned to agents (DOD, DSDP, DION, IMAN etc)',
    ],
    files: [
      { file: 'services/omi/OMIService.js', line: '~1411', fn: 'MARSRealtime.processCompletedMemory()' },
      { file: 'services/taste/MARSRealtime.js', line: '~334', fn: 'sendMARSEmail()' },
      { file: 'services/taste/MARSRealtime.js', line: '~315', fn: 'AIR.process() for HIGH significance COOK tasks' },
    ],
    howToStop: 'Disable sendMARSEmail() in services/taste/MARSRealtime.js line 334. Or remove "mars" trigger from OMIService.js line 1411.',
    brain_markers: ['mars.pipeline.result', 'mars.report.rt', 'cook.rt'],
    detect: (source, type, content) =>
      source?.includes('mars.pipeline') || source?.includes('mars.report') || type === 'mars_pipeline_result' || type === 'mars_report',
  },

  // IMAN direct email (from AIR tool use)
  iman_send: {
    trigger: 'AIR decided to send an email during a conversation or tool chain',
    chain: [
      'User or system sent message to AIR (any channel)',
      'Claude Sonnet processed with Fat Context Window (FCW)',
      'Claude chose to use send_email tool',
      'airExecutor.js executeTool("send_email") fires',
      'Nylas API sends via Claudette grant',
      'Dedup marker written to brain',
    ],
    files: [
      { file: 'lib/airExecutor.js', line: '~774', fn: 'case "send_email"' },
      { file: 'lib/air.js', line: '~1016-1080', fn: 'send_email tool implementation' },
    ],
    howToStop: 'Check which channel triggered AIR. If automated (proactive/cron/taste/cook), add channel to CEECEE guard blocklist in airExecutor.js line ~2219.',
    brain_markers: ['iman_send_', 'iman_email_sent_', 'email_sent_'],
    detect: (source, type) =>
      source?.startsWith('iman_send') || source?.startsWith('iman_email') || (type === 'email_sent' && source?.startsWith('iman')),
  },

  // Proactive/DAWN emails
  proactive_email: {
    trigger: 'HeartbeatService proactive cron ran on schedule',
    chain: [
      'Cron fires every 5 minutes in HeartbeatService.js',
      'checkScheduledTasks() runs at configured hours (8am, 12pm, 6pm EST)',
      'Builds proactive update (AWA alerts, calendar, etc)',
      'Sends through AIR with channel "proactive_email"',
      'AIR generates email and calls send_email tool',
      'CEECEE guard should block this (if working)',
    ],
    files: [
      { file: 'services/heartbeat/HeartbeatService.js', line: '~395-540', fn: 'proactive cron block' },
      { file: 'lib/airExecutor.js', line: '~2219', fn: 'CEECEE guard channel filter' },
    ],
    howToStop: 'PRE-ALPHA: Proactive is hardcoded to Brandon only. To stop entirely, comment out the proactive block in HeartbeatService.js around line 395.',
    brain_markers: ['proactive_email', 'dawn_briefing', 'heartbeat'],
    detect: (source, type, content) =>
      source?.includes('proactive') || source?.includes('dawn') || source?.includes('heartbeat') ||
      (type === 'email_dedup' && (content || '').includes('pipeline_update')),
  },

  // TASTE batch transcript email
  taste_transcript: {
    trigger: 'TASTE batch processor compiled OMI fragments and sent full transcript through AIR',
    chain: [
      'HeartbeatService cron triggers TASTE batch every 3 hours',
      'TasteBatchProcessor.runBatch() compiles OMI fragments into sessions',
      'processSessionWithAIR() sends FULL TRANSCRIPT to AIR',
      'AIR/IMAN emails the raw transcript to Brandon',
      'THIS IS THE BUG: raw family conversations get emailed',
    ],
    files: [
      { file: 'services/taste/TasteBatchProcessor.js', line: '~469-500', fn: 'processSessionWithAIR()' },
      { file: 'services/heartbeat/HeartbeatService.js', line: '~325', fn: 'TASTE batch trigger' },
    ],
    howToStop: 'ALREADY KILLED in PRE-ALPHA. Channel renamed to taste_batch_no_email. CEECEE guard blocks taste channels.',
    brain_markers: ['taste_batch_processed', 'taste_batch_result', 'taste_batch_summary'],
    detect: (source, type) =>
      source?.includes('taste_batch') || type === 'taste_batch_result' || type === 'taste_batch_summary',
  },

  // COOK task/delivery emails
  cook_scaffold: {
    trigger: 'COOK executor tried to deliver agent work product via email',
    chain: [
      'MARSRealtime assigned COOK tasks to agents',
      'COOKExecutor.executeDeliveryViaAIR() fires for delivery agents',
      'AIR processes with "cook_executor_delivery" channel',
      'IMAN sends raw scaffold email ("COOK DELIVERY TASK", "AGENT: IMAN")',
    ],
    files: [
      { file: 'services/taste/COOKExecutor.js', line: '~212-250', fn: 'executeDeliveryViaAIR()' },
      { file: 'services/taste/MARSRealtime.js', line: '~315-330', fn: 'HIGH significance COOK dispatch' },
    ],
    howToStop: 'ALREADY KILLED in PRE-ALPHA. Channel renamed. CEECEE guard blocks cook channels.',
    brain_markers: ['cook.rt', 'cook.deliverable', 'cook_task'],
    detect: (source, type) =>
      source?.includes('cook.') || type === 'cook_task' || type === 'cook_deliverable',
  },

  // AWA proactive alerts
  awa_alert: {
    trigger: 'AWA proactive alerts found MATERIALS_READY jobs during heartbeat',
    chain: [
      'HeartbeatService cron fires',
      'awa-tools-v2.js executeAWAProactiveAlerts() checks job statuses',
      'Finds MATERIALS_READY or interview upcoming',
      'Sends through AIR on proactive_email channel',
      'CEECEE guard should block the email',
    ],
    files: [
      { file: 'lib/awa-tools-v2.js', line: '~1209', fn: 'MATERIALS_READY alert check' },
      { file: 'services/heartbeat/HeartbeatService.js', line: '~440', fn: 'AWA proactive trigger' },
    ],
    howToStop: 'CEECEE guard blocks proactive channels. Dedup fix cross-checks sent applications. If still leaking, add status check in awa-tools-v2.js.',
    brain_markers: ['awa_proactive', 'approval_queue'],
    detect: (source, type, content) =>
      (type === 'email_dedup' && (content || '').toLowerCase().includes('approv')) ||
      source?.includes('awa_proactive'),
  },

  // OMI voice command
  omi_command: {
    trigger: 'Brandon said a wake word ("ABA" / "Ava") near the OMI pendant',
    chain: [
      'OMI streaming webhook receives transcript segment',
      'OMIService.js detectWakeWord() triggers',
      'Command extracted, identity verified',
      'executeAIRCommand() sends to AIR',
      'AIR processes with tools (send_email, search_calendar, etc)',
    ],
    files: [
      { file: 'services/omi/OMIService.js', line: '~100-400', fn: 'processWebhook() → detectWakeWord() → executeAIRCommand()' },
    ],
    howToStop: 'This is intentional. Voice commands should trigger AIR. If false positive, check wake word TTL (should be 5s) and min command length guard.',
    brain_markers: ['aba_command_executed', 'omi_wake_command'],
    detect: (source, type) =>
      type === 'aba_command_executed' || source?.includes('omi_wake'),
  },

  // Email task processing (inbound email triggers AIR)
  email_task: {
    trigger: 'An inbound email arrived that AIR processed as a task',
    chain: [
      'Nylas webhook fires /api/email/webhook (worker.js)',
      'Email classified as requiring action',
      'AIR.process() called with email context',
      'AIR decides what to do (reply, forward, create task, etc)',
    ],
    files: [
      { file: 'worker.js', fn: 'Nylas email webhook handler' },
    ],
    howToStop: 'Check which emails are being classified as tasks. May need to add sender/subject filters.',
    brain_markers: ['email_task_processed'],
    detect: (source, type) => type === 'email_task_processed',
  },
};

// Given a list of brain entries, determine which code path fired
function identifyCodePath(entries) {
  const matches = [];
  for (const entry of entries) {
    const src = entry.source || '';
    const type = entry.memory_type || '';
    const content = entry.content || '';

    for (const [pathId, path] of Object.entries(CODE_PATHS)) {
      if (path.detect(src, type, content)) {
        if (!matches.find(m => m.id === pathId)) {
          matches.push({ id: pathId, ...path, matchedEntry: { source: src, type, created_at: entry.created_at } });
        }
      }
    }
  }
  return matches;
}

module.exports = { CODE_PATHS, identifyCodePath };
