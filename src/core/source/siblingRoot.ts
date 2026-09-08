// ---------------------------------------------------------------------------
// The sibling REPOSITORIES root, as a leaf constant.
//
// This lives apart from `siblingSource.ts` on purpose. The confined
// sibling-source READER is a substantial module (filesystem access, Git
// metadata, oracle types); the root it defaults to is one string. Modules that
// need only the string — such as the private-path topology authority — must
// not drag the reader's whole cone in behind it, because that cone then has to
// be mirrored anywhere the importer is mirrored.
//
// Pure data. No imports.
// ---------------------------------------------------------------------------

export const DEFAULT_SIBLING_ROOT = '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';
