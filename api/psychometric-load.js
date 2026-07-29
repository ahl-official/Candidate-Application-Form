const { callAppsScript, setCors } = require('../lib/appsScript');

function normalizeEntityType(entityType) {
  const t = String(entityType || 'Candidate').trim().toLowerCase();
  return t === 'employee' ? 'Employee' : 'Candidate';
}

/**
 * Loads psychometric session for /psychometric/:id?entity=Candidate|Employee
 * Body: { id, entityType }
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

    if (!id) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID',
        message: 'Invalid ID.',
      });
    }

    const resultRes = await callAppsScript({
      action: 'getPsychometricResult',
      id,
      interviewId: id,
      entityType,
    });

    if (!resultRes || resultRes.status === 'error') {
      const code = resultRes?.errorCode || '';
      const notFound =
        code === 'PSYCHOMETRIC_PERSON_NOT_FOUND' ||
        code === 'PSYCHOMETRIC_CANDIDATE_NOT_FOUND' ||
        code === 'PSYCHOMETRIC_ID_MISSING' ||
        code === 'PSYCHOMETRIC_INTERVIEW_ID_MISSING' ||
        /not found/i.test(String(resultRes?.message || '')) ||
        /id is required/i.test(String(resultRes?.message || ''));

      return res.status(notFound ? 404 : 502).json({
        success: false,
        code: notFound ? 'INVALID_ID' : code || 'LOAD_FAILED',
        message: notFound
          ? `Invalid ${entityType.toLowerCase()} ID.`
          : resultRes?.message ||
            'Could not load this assessment. Please try again later.',
        details: resultRes?.details || '',
      });
    }

    const result = resultRes.data || {};
    const status = String(result.status || '').trim().toLowerCase();

    if (status === 'completed') {
      return res.status(200).json({
        success: true,
        state: 'completed',
        data: {
          id: result.id || id,
          entityType: result.entityType || entityType,
          interviewId: result.interviewId || (entityType === 'Candidate' ? id : ''),
          candidateName: result.candidateName || '',
          position: result.position || result.appliedRole || '',
          status: 'Completed',
          testCompletedAt: result.testCompletedAt || '',
        },
      });
    }

    const questionsRes = await callAppsScript({
      action: 'getPsychometricQuestions',
      id,
      interviewId: id,
      entityType,
    });

    if (!questionsRes || questionsRes.status === 'error') {
      return res.status(502).json({
        success: false,
        code: questionsRes?.errorCode || 'QUESTIONS_LOAD_FAILED',
        message:
          questionsRes?.message ||
          'Could not load assessment questions. Please try again later.',
        details: questionsRes?.details || '',
      });
    }

    const qData = questionsRes.data || {};

    return res.status(200).json({
      success: true,
      state: 'ready',
      data: {
        id: qData.id || result.id || id,
        entityType: qData.entityType || result.entityType || entityType,
        interviewId:
          qData.interviewId ||
          result.interviewId ||
          (entityType === 'Candidate' ? id : ''),
        candidateName: qData.candidateName || result.candidateName || '',
        position: qData.position || result.position || '',
        status: result.status || 'Not Started',
        questionCount: qData.questionCount || (qData.questions || []).length,
        questions: qData.questions || [],
      },
    });
  } catch (error) {
    console.error('[psychometric-load]', error);
    return res.status(500).json({
      success: false,
      code: error.code || 'SERVER_ERROR',
      message: error.message || 'Failed to load psychometric assessment.',
      details: error.details || '',
    });
  }
};
