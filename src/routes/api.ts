import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

function parsePagination(query: Request['query']): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

router.get('/patients', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, ehr_id, given_name, family_name, phone, created_at, updated_at
         FROM patients
         ORDER BY family_name NULLS LAST, given_name NULLS LAST
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM patients'),
    ]);

    const total = countResult.rows[0].total as number;

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients', details: String(error) });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           a.id,
           a.ehr_id,
           a.start_time,
           a.end_time,
           a.status,
           a.patient_ehr_id,
           p.given_name AS patient_given_name,
           p.family_name AS patient_family_name,
           p.phone AS patient_phone,
           a.provider_ehr_id,
           pr.display_name AS provider_name,
           a.location_ehr_id,
           l.display_name AS location_name,
           a.created_at,
           a.updated_at
         FROM appointments a
         LEFT JOIN patients p ON p.ehr_id = a.patient_ehr_id
         LEFT JOIN providers pr ON pr.ehr_id = a.provider_ehr_id
         LEFT JOIN locations l ON l.ehr_id = a.location_ehr_id
         ORDER BY a.start_time DESC NULLS LAST
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM appointments'),
    ]);

    const total = countResult.rows[0].total as number;

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments', details: String(error) });
  }
});

export default router;
