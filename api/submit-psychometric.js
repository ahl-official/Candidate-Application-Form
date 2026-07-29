const { callAppsScript, setCors } = require('../lib/appsScript');

function normalizeEntityType(entityType) {
  const t = String(entityType || 'Candidate').trim().toLowerCase();
  return t === 'employee' ? 'Employee' : 'Candidate';
}

/**
 * Submits DISC answers. Sends optionIds only — Apps Script scores server-side.
 * Body: { id, entityType, optionIds: ["1_D","2_I",...] }
 */
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const id = String(
      (req.body && (req.body.id || req.body.interviewId)) || ''
    ).trim();
    const entityType = normalizeEntityType(req.body && req.body.entityType);
    // Accept optionIds only — ignore any client-sent scores/profile.
    const rawIds = (req.body && req.body.optionIds) || [];
    const optionIds = Array.isArray(rawIds)
      ? rawIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    if (!id) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_ID',
        message: 'ID is required.',
      });
    }

    if (!optionIds.length) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_ANSWERS',
        message: 'Answers are required.',
      });
    }

    const saveRes = await callAppsScript({
      action: 'savePsychometricResult',
      id,
      interviewId: id,
      entityType,
      optionIds,
    });

    if (!saveRes || saveRes.status === 'error') {
      const code = saveRes?.errorCode || '';
      const already =
        code === 'PSYCHOMETRIC_ALREADY_COMPLETED' ||
        /already completed/i.test(String(saveRes?.message || ''));

      return res.status(already ? 409 : 502).json({
        success: false,
        code: code || (already ? 'ALREADY_COMPLETED' : 'SAVE_FAILED'),
        message:
          saveRes?.message ||
          'Could not save your assessment. Please try again.',
        details: saveRes?.details || '',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Personality assessment submitted successfully.',
      data: saveRes.data || null,
    });
  } catch (error) {
    console.error('[submit-psychometric]', error);
    return res.status(500).json({
      success: false,
      code: error.code || 'SERVER_ERROR',
      message: error.message || 'Failed to submit psychometric assessment.',
      details: error.details || '',
    });
  }
};
