import raw from '../data/baseline.json';
import { validateDataset } from './schema';
export const baseline = validateDataset(raw);
