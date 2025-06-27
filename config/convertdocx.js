import { CONVERT_SECRET } from './env.js';
// Import ConvertAPI
import ConvertApi from 'convertapi';

let convertApi = new ConvertApi(CONVERT_SECRET);

export default convertApi;