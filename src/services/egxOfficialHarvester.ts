import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export class EgxOfficialHarvesterService {
  private isHarvesting: boolean = false;

  public async runHarvest(): Promise<boolean> {
    if (this.isHarvesting) {
      logger.info('⏳ [EgxOfficialHarvester] Harvest already in progress. Skipping duplicate run.');
      return false;
    }

    this.isHarvesting = true;
    logger.info('🚀 [EgxOfficialHarvester] Starting scheduled official EGX Beta market harvest...');

    return new Promise((resolve) => {
      // Possible python script paths
      const pyScriptPaths = [
        path.join(process.cwd(), 'harvest_egx_official.py'),
        '/home/azureuser/egx-stock-bot/harvest_egx_official.py',
        path.join(__dirname, '..', '..', 'harvest_egx_official.py')
      ];

      let pyScript = '';
      for (const p of pyScriptPaths) {
        if (fs.existsSync(p)) {
          pyScript = p;
          break;
        }
      }

      if (!pyScript) {
        logger.warn('⚠️ [EgxOfficialHarvester] harvest_egx_official.py not found on filesystem. Skipping live harvest.');
        this.isHarvesting = false;
        return resolve(false);
      }

      // Detect python executable (virtualenv on VM or system python)
      const venvPy = '/home/azureuser/test_impersonate/venv/bin/python3';
      const pythonBin = fs.existsSync(venvPy) ? venvPy : 'python3';

      const cmd = `${pythonBin} "${pyScript}"`;

      exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
        this.isHarvesting = false;
        if (error) {
          logger.error(`❌ [EgxOfficialHarvester] Error executing harvest: ${error.message}`);
          return resolve(false);
        }

        logger.info(`✅ [EgxOfficialHarvester] Harvest complete. Output:\n${stdout}`);
        resolve(true);
      });
    });
  }
}
