// fairwire-core on fair-agent-core 8.0.0. Written by tools/port-family.mjs from this
// package's own former core: the names, reading rules and data below are the ones it had.
// Everything this package shares with the other Fair families now comes from the engine.
import * as core from 'fair-agent-core';
import { EXPORTS as exportsData, EXPORTS_BASIS_NOTE as exportsNote } from './data/exports.js';
import { COLUMN_WORDS as columnWords, FIELD_CONCEPTS as fieldConcepts } from './data/columns.js';
import { PiiMasker, PII_MODES, loadPiiKey } from './pii.js';

export const FAMILY_PROFILE = core.defineFamily({
  id: "fairwire", brand: "Fairwire", corePkg: "fairwire-core", approveBin: "fairwire-approve", icsProdId: "-//Fairwire//fairwire-core//EN",
  // How this family reads files where the families differ (see fair-agent-core/src/family.js).
  dialect: { units: true, ownName: 'keep', decimals: 'file', groupedEvidence: true, monthHeaders: false, legalTails: 'extended', localValues: false, aliasSkipsTaken: false, emptyMarks: true, percentWord: false },
  previewHidden: /secret|token|password|key|tin|ssn|card|iban|account|email|phone|dob|birth|user|login|upn|imei|msisdn/i,
  limits: {"pathChars":4096,"nameChars":255},
  prefixPattern: /^(?=.{1,30}$)[a-z][a-z0-9]*(_[a-z0-9]+){0,3}$/,
  exports: exportsData, exportsNote, columnWords, fieldConcepts,
  memoryExample: "Subsidiary US01 posts in USD", prefixHint: " in snake_case job words, e.g. \"dns_records\"",
  masking: {
    name: "pii", prop: "pii", method: "piiMasker", options: ["pii"], optionLabel: "pii", env: null,
    keyOptions: ["piiKey"], keyForm: "hex", modes: PII_MODES, Masker: PiiMasker, loadKey: loadPiiKey,
    auditField: "pii_mode", ctx: "always", rawRecords: false, deep: true, maskSummary: false, reason: "clip",
    cliFlags: ["pii"], cliEnv: "PII", cliHelp: "  --pii mask|strict|off           Personal-data masking of results the model sees (FAIRWIRE_PII, default mask).\n                                  strict also hides host names and every IP address; off is logged",
    off: (out, pii) => ({ ...out, warnings: [...(out.warnings || []), 'Personal-data masking is OFF (pii: off): names, sign-in names, phone numbers and client addresses in this result are real.'] }),
    done: (masked, rep) => (Object.keys(rep.masked).length ? { ...masked, personal_data: rep } : masked),
  },
});

const api = core.bindApi(core, FAMILY_PROFILE, {
  EXPORTS: exportsData, EXPORTS_BASIS_NOTE: exportsNote, COLUMN_WORDS: columnWords, FIELD_CONCEPTS: fieldConcepts,
  SOURCES_FILE: FAMILY_PROFILE.sourcesFile, LICENSE_PREFIX: FAMILY_PROFILE.licensePrefix,
  SOURCES_CONFIG_SCHEMA: core.sourcesConfigSchema(FAMILY_PROFILE), CORE_TEXT: core.coreCatalog(FAMILY_PROFILE),
  NOTE_KIND: core.noteKind(FAMILY_PROFILE), MAX_PATH_CHARS: FAMILY_PROFILE.limits.pathChars, MAX_NAME_CHARS: FAMILY_PROFILE.limits.nameChars, KNOWN_HEADER_WORDS: core.inFamily(FAMILY_PROFILE, core.knownHeaderWords),
});

export const {
  AgentRuntime, ApprovalStore, AuditLog, COLUMN_LANGUAGES, COLUMN_WORDS, CORE_TEXT, DECISIONS, DEFAULT_CAPS, DEFAULT_UNITS, DomainMemory, ENCODINGS,
  EXPORTS, EXPORTS_BASIS_NOTE, FAIR, FAMILY, FIELD_CONCEPTS, FIELD_TYPES, HTML_LANG, INSPECT_SCHEMA, KINDS, KNOWN_HEADER_WORDS, LANGS, LANG_NAMES,
  LICENSE_FILE, LICENSE_PREFIX, LICENSE_PUBLIC_KEYS, LICENSE_REVOKED_IDS, MAX_NAME_CHARS, MAX_PATH_CHARS, MEMORY_CATEGORY, MEMORY_DIR, MODES,
  ManifestError, NOTE_KIND, ONE_CLICK_CATEGORIES, P, PolicyEngine, SOURCES_CONFIG_SCHEMA, SOURCES_FILE, STATE_KINDS, StateKeyError, TABLE_EXTENSIONS,
  TIERS, UNITS, UsageStore, ValidationError, W, accessibleTables, adaptRecords, annotationsFor, appendStateLine, applyUnifiedDiff, approvalIdFor,
  argDocsProblems, assertValid, bindApi, canonical, capHit, carryGroup, checkLicense, cleanAmount, columnShape, compareEvals, conceptOf,
  convertStateFile, coreCatalog, coreText, createMcpHandler, decimalEvidence, decodeText, defineFamily, defineManifest, demoRuntime, describeSources,
  documentSchema, docxText, encodingName, encodingWarning, envSeal, escapeHtml, evalReportHtml, excelSerialToIso, exportCatalogue, exportEntry,
  exportProfile, familyOf, findHeaderRow, firstRowPer, foldText, friendlyError, fullName, generateSigningKey, generateStateKey, htmlPage, inFamily,
  inferDateOrder, inferDecimal, injectionSignals, isDateFormat, isEmptyMark, isLang, isSealed, issueLicense, jaroWinkler, keyId, kindsByArg,
  knownHeaderWords, levenshtein, licenseHas, licenseKeyMap, licenseView, loadPublicKeys, loadSigner, loadSourceOverrides, main, makeText, maskValue,
  matchRule, memoryFile, memoryTools, memoryValueProblem, mergeCatalogs, nameSimilarity, namesFor, neutraliseFormula, normHeader, normLang,
  normalizeAddress, normalizeName, noteKind, numberReader, openLine, overrideFor, parseAnyDate, parseCsv, parseCsvRows, parseFlags, parseLicense,
  parseStateKey, periodKey, printStep, readAudit, readLicenseToken, readNumber, readRecords, readStateJson, readStateLines, readTable, readXlsx,
  readYesNo, readZip, resolveSeal, round2, rowsToRecords, runCli, runEvalFile, runEvals, runtimeFromFlags, safeFileName, safeMarkdown, safePath,
  sealLine, serveApprovals, serveStdio, sha256, sha256File, shannonEntropy, signWebhook, slugify, sniffDelimiter, sourcesConfigSchema, stateSeal,
  stripLegalForms, stripLegalTail, stripUnit, toCsv, toIcs, toNumber, toSarif, tokenSetSimilarity, translatedNames, trustedLicenseKeys, undocumentedArgs,
  unifiedDiff, uniqueNames, unitInHeader, validate, validateIcs, validateSarif, verifyChain, verifySignature, verifyWebhook, writeEvalReport,
  writeStateJson, writeXlsx, writeZip, xlsxSheets
} = api;
