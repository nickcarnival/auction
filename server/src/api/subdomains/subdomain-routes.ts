import { ApiError } from '@/errors/api-error';
import { Router, type Request } from 'express';
import { getSubdomainByCode } from './subdomain-service';

const router = Router();

router.get('/get-by-code', async (req: Request, res) => {
  try {
    const { code } = req.query;

    if (typeof code !== 'string' || !code.trim()) {
      return res
        .status(400)
        .json(ApiError.badRequest('MISSING_SUBDOMAIN_CODE', 'code query is required').toJSON());
    }

    const config = await getSubdomainByCode(code);

    if (!config) {
      return res.status(404).json(null);
    }

    res.json(config);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to resolve subdomain').toJSON());
  }
});

export default router;
