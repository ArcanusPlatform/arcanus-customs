import { Router } from 'express';
import multer from 'multer';
import { CSVProcessor } from '../services/csv-processor.js';
import { DeclarationStore } from '../services/declaration-store.js';
import { HMRCDeclarationInformationService } from '../services/hmrc-info/declaration-service.js';
import { HMRCNotificationEventProcessor } from '../services/hmrc-notifications/event-processor.js';
import { ensureDirectory, getUploadsRoot } from '../config/storage-paths.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// File upload configuration
const uploadDir = ensureDirectory(getUploadsRoot());
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
  }
});

const csvProcessor = new CSVProcessor();

/**
 * Middleware to inject tenantDb and get company context
 */
router.use((req, res, next) => {
  // tenantDb and company_id are injected by tenant middleware
  if (!req.tenantDb || !req.user?.company_id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - missing tenant or user context'
    });
  }
  next();
});

/**
 * POST /cds/import - Upload and process CSV files
 */
router.post('/import', upload.fields([
  { name: 'header', maxCount: 1 },
  { name: 'items', maxCount: 1 },
  { name: 'tax', maxCount: 1 }
]), async (req, res, next) => {
  try {
    const files = req.files;
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    if (!files || !files.header) {
      return res.status(400).json({
        success: false,
        message: 'Header file is required'
      });
    }

    const headerFile = files.header[0];
    const itemsFile = files.items?.[0];
    const taxFile = files.tax?.[0];

    // Process CSV files
    const result = await csvProcessor.processFiles({
      header: headerFile,
      items: itemsFile,
      tax: taxFile
    }, companyId);

    // Create store for this company
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    
    // Save to database
    const batchId = uuidv4();
    store.saveBatch(
      batchId,
      headerFile.originalname,
      result.declarations,
      result.items,
      result.taxLines,
      result.errors,
      result.warnings,
      result.cdsRecords
    );

    res.json({
      success: true,
      batch: {
        batchId,
        declarations: result.declarations.length,
        items: result.items.length,
        taxLines: result.taxLines.length,
        cdsRecords: result.cdsRecords.length,
        documents: 0,
        errors: result.errors.length,
        warnings: result.warnings.length
      },
      cdsRecords: result.cdsRecords
    });
  } catch (error) {
    console.error('CSV import error:', error);
    next(error);
  }
});

/**
 * GET /cds/declarations - List declarations
 */
router.get('/declarations', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const filter = {
      mrn: req.query.mrn,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit || 50
    };

    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const declarations = store.getDeclarations(filter);
    
    res.json({ declarations });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cds/declarations/:id - Get single declaration
 */
router.get('/declarations/:id', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const declaration = store.getDeclaration(req.params.id);
    
    if (!declaration) {
      return res.status(404).json({
        success: false,
        message: 'Declaration not found'
      });
    }

    res.json(declaration);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cds/declarations/:id/versions - Get declaration version history
 */
router.get('/declarations/:id/versions', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const versions = store.getDeclarationVersions(req.params.id);
    
    res.json({ versions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cds/declarations/:id/events - Get raw HMRC event history
 */
router.get('/declarations/:id/events', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const events = store.getDeclarationEvents(req.params.id);
    
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /cds/declarations/:id - Delete declaration
 */
router.delete('/declarations/:id', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const success = store.deleteDeclaration(req.params.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Declaration not found'
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cds/declarations/:id/assign-client - Assign client to declaration
 */
router.post('/declarations/:id/assign-client', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    const { clientId, clientName } = req.body;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const success = store.assignClient(req.params.id, clientId, clientName);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Declaration not found'
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cds/analysis/run - Move unchecked declarations through automated audit.
 */
router.post('/analysis/run', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    const declarationIds = Array.isArray(req.body?.declaration_ids) ? req.body.declaration_ids : [];

    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const result = store.runAutoAnalysis(declarationIds);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cds/analysis/records - Checked audit records for the Refund Analysis view.
 */
router.get('/analysis/records', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;

    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const records = store.getAnalyzedRecords({
      riskProfile: req.query.riskProfile,
      limit: Number(req.query.limit) || 250
    });

    res.json({ records });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /cds/analysis/records/:id - Human linked-draft review updates.
 */
router.patch('/analysis/records/:id', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;

    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const record = store.updateAuditReview(req.params.id, req.body || {});

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Audit record not found'
      });
    }

    res.json({ success: true, record });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cds/manifest/summary - Get statistics
 */
router.get('/manifest/summary', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const summary = store.getSummary();
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cds/batches - Get import batches
 */
router.get('/batches', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const batches = store.getBatches();
    
    res.json({ batches });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cds/batches/:batchId/errors - Get batch errors
 */
router.get('/batches/:batchId/errors', async (req, res, next) => {
  try {
    const store = new DeclarationStore(req.tenantDb, req.user.company_id, req.user.id);
    const errors = store.getBatchErrors(req.params.batchId);
    
    res.json({ errors });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cds/hmrc/events - Simulate or receive an HMRC notification event
 */
router.post('/hmrc/events', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    const notification = req.body?.payload ?? req.body;
    
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const processor = new HMRCNotificationEventProcessor(store);
    const event = await processor.process(req.user.id, notification);

    res.json({
      success: true,
      event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cds/hmrc/fetch/:mrn - Fetch declaration from HMRC API
 */
router.post('/hmrc/fetch/:mrn', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const declarationService = new HMRCDeclarationInformationService(companyId);
    
    // Fetch from the Customs Declarations Information API
    const declaration = await declarationService.fetchDeclarationByMrn(req.params.mrn);
    
    // Save to database
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    const id = store.saveCanonicalDeclaration(declaration, {
      source: 'hmrc_api',
      userId: req.user.id
    });
    
    res.json({
      success: true,
      declaration_id: id,
      mrn: declaration.mrn,
      message: 'Declaration fetched from HMRC and saved'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cds/hmrc/sync - Sync declarations from HMRC API
 */
router.post('/hmrc/sync', async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const tenantDb = req.tenantDb;
    
    const declarationService = new HMRCDeclarationInformationService(companyId);
    
    const params = {
      from_date: req.body.from_date,
      to_date: req.body.to_date,
      eori: req.body.eori
    };
    
    // Fetch from the Customs Declarations Information API
    const result = await declarationService.listDeclarations(params);
    
    // Save each declaration
    const store = new DeclarationStore(tenantDb, companyId, req.user.id);
    let savedCount = 0;
    for (const declaration of result.declarations || []) {
      try {
        store.saveCanonicalDeclaration(declaration, {
          source: 'hmrc_api',
          userId: req.user.id,
          throwOnError: false
        });
        savedCount++;
      } catch (err) {
        console.error(`Error saving declaration ${declaration.mrn}:`, err.message);
      }
    }
    
    res.json({
      success: true,
      synced: savedCount,
      message: `Synced ${savedCount} declarations from HMRC`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
