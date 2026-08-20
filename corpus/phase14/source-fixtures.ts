// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — deterministic synthetic source fixtures (SPEC §10,
// design "Corpus philosophy").
//
// DATA ONLY. These are SOURCE TEXT snippets (PHP handler source and generated/
// interface JSON schema), never product data, never customer values. Each
// fixture is constructed to exercise ONE proof class (positive) or ONE
// rejection class (negative) of the versioned mechanical analyzer
// (src/oracles/expectations/extract/analyzer.ts). Adversarial cases include
// comments/string-literals that LOOK like contracts, dynamic keys, runtime DB
// reads, nested conditional blobs, missing generated schemas, and privacy
// sentinels that must never leak into derived safe evidence.
//
// The analyzer must never execute these; it only tokenizes/structurally
// scans them. Changing a fixture's bytes changes its evidence digest.
// ---------------------------------------------------------------------------

// --- LITERAL_ROW_FIELD_SET (positive) ------------------------------------

export const litRowKeys = `<?php
namespace App\\Handler;

class Report
{
    public function buildRows(): array
    {
        $res = [
            'id' => 1,
            'name' => 'x',
        ];
        return $res;
    }
}
`;

export const litRowKeysPush = `<?php
namespace App\\Handler;

class Report
{
    public function buildRows(): array
    {
        $res = [];
        $res[] = [
            'k1' => 1,
            'k2' => 'a',
        ];
        return $res;
    }
}
`;

// --- SCALAR_TYPE_FROM_CAST (positive) -------------------------------------

export const scalarCastObject = `<?php
namespace App\\Handler;

class Caster
{
    public function getX(): array
    {
        $res = [];
        $r = [];
        if (empty($r)) {
            $r = (object)$r;
        }
        $res[] = [
            'r' => $r,
            'm' => 1,
        ];
        return $res;
    }
}
`;

export const scalarCastArrayOrKeys = `<?php
namespace App\\Handler;

class Caster
{
    public function getY(): array
    {
        $res = [];
        $r = [];
        $r['a'] = 1;
        $res[] = [
            'r' => $r,
            'id' => 1,
        ];
        return $res;
    }
}
`;

// --- BRANCH_UNION_TYPE_SET (positive / negative) --------------------------

export const branchUnionFinite = `<?php
namespace App\\Handler;

class Classifier
{
    public function classify(string $x)
    {
        $field = 1;
        if ($x === 'a') {
            $field = 's';
        }
        elseif ($x === 'b') {
            $field = 2;
        }
        else {
            $field = true;
        }
        return $field;
    }
}
`;

export const branchUnionNoElse = `<?php
namespace App\\Handler;

class Classifier
{
    public function classify(string $x)
    {
        $field = 1;
        if ($x === 'a') {
            $field = 's';
        }
        elseif ($x === 'b') {
            $field = 2;
        }
        return $field;
    }
}
`;

export const branchUnionUnenumerable = `<?php
namespace App\\Handler;

class Classifier
{
    public function classify($x, $row)
    {
        $field = 1;
        if ($x) {
            $field = $row['col'];
        }
        else {
            $field = 2;
        }
        return $field;
    }
}
`;

// --- EMPTY_NONEMPTY_BIFURCATION (positive / negative) ---------------------

export const emptyNonEmptyPositive = `<?php
namespace App\\Handler;

class Bifurc
{
    public function f()
    {
        $f = [];
        if (empty($f)) {
            $f = 's';
        }
        else {
            $f = [];
        }
        return $f;
    }
}
`;

export const emptyNonEmptyNoElse = `<?php
namespace App\\Handler;

class Bifurc
{
    public function f()
    {
        $f = [];
        if (empty($f)) {
            $f = 1;
        }
        return $f;
    }
}
`;

// --- ALIAS_COPY_FLOW (positive / negative) --------------------------------

export const aliasCopyPositive = `<?php
namespace App\\Handler;

class Copier
{
    public function f($source)
    {
        $alias = $source;
        return $alias;
    }
}
`;

export const aliasCopyDynamic = `<?php
namespace App\\Handler;

class Copier
{
    public function f()
    {
        $alias = compute();
        return $alias;
    }
}
`;

// --- RETURN_ENVELOPE_FIELD_PRESENCE (positive / negative) ------------------

export const returnEnvelopePositive = `<?php
namespace App\\Handler;

class Account
{
    public function getAccountVendor()
    {
        $res = [
            'account_id' => 1,
            'vendor' => 2,
        ];
        return $res;
    }
}
`;

export const returnEnvelopeNonAccumulator = `<?php
namespace App\\Handler;

class Account
{
    public function g()
    {
        $res = ['account_id' => 1];
        if (true) {
            return $res;
        }
        return null;
    }
}
`;

// --- RUNTIME / DB VALUE (negative) ----------------------------------------

export const runtimeDbValue = `<?php
namespace App\\Handler;

class Exchange
{
    public function getExchangeRate()
    {
        $res = [];
        $exchange_rate = $data['rate'];
        $res[] = [
            'exchange_rate' => $exchange_rate,
        ];
        return $res;
    }
}
`;

// --- DYNAMIC KEY (negative) -----------------------------------------------

export const dynamicKeyReject = `<?php
namespace App\\Handler;

class Dynamic
{
    public function f()
    {
        $res = [];
        $key = 'dynamic';
        $res[$key] = ['id' => 1];
        return $res;
    }
}
`;

// --- CHUNK / TRANSPORT (positive / negative) ------------------------------

export const commentOnlyChunk = `<?php
namespace App\\Handler;

class Billing
{
    public function getBillingGroups()
    {
        // This endpoint returns a chunked stream of billing groups
        $res = [['id' => 1]];
        return $res;
    }
}
`;

export const structuralChunkPositive = `<?php
namespace App\\Handler;

class Pager
{
    public function p()
    {
        $pageSize = 50;
        $res = [['id' => 1]];
        return $res;
    }
}
`;

export const legacyConditionalBlob = `<?php
namespace App\\Handler;

class Legacy
{
    public function getLegacyBillingGroups($x, $y)
    {
        if ($x) {
            if ($y) {
                $blob = computeBlob();
            }
            else {
                $blob = ['a' => 1];
            }
        }
        $res = [['blob' => $blob ?? []]];
        return $res;
    }
}
`;

export const grpcChunkNoMarker = `<?php
namespace App\\Handler;

class Grpc
{
    public function callBillingGroupsGrpc()
    {
        // gRPC chunked billing-groups stream
        $client = new GrpcClient();
        return $client->stream();
    }
}
`;

export const crossServiceAssumption = `<?php
namespace App\\Handler;

class Remote
{
    public function getRemote()
    {
        $client = new GuzzleClient();
        $resp = $client->get('https://other-service/');
        $res = [['id' => 1]];
        return $res;
    }
}
`;

// --- GENERATED / INTERFACE (positive / negative) --------------------------

export const genInterfaceFinite = JSON.stringify({
    type: "interface",
    fields: [
        { name: "id", type: "string" },
        { name: "amt", type: "number" },
    ],
});

export const genInterfaceMissingFields = JSON.stringify({ type: "interface" });

export const genInterfaceNotJson = "this is not json at all";

export const genInterfaceDynamicType = JSON.stringify({
    fields: [{ name: "x", type: "dynamic" }],
});

export const genInterfaceUnrecognized = JSON.stringify({
    fields: [{ name: "x" }],
});

// --- ALIAS cycle (negative) ------------------------------------------------

export const aliasCopyCycle = `<?php
namespace App\\Handler;

class Copier
{
    public function f($source, $mid)
    {
        $alias = $mid;
        $mid = $alias;
        return $alias;
    }
}
`;

// --- GENERATED / INTERFACE nested + repeated + required/optional (positive / negative) ---

export const genInterfaceNested = JSON.stringify({
    type: "interface",
    fields: [
        { name: "id", type: "string" },
        {
            name: "addr",
            type: "object",
            fields: [
                { name: "street", type: "string" },
                { name: "zip", type: "number" },
            ],
        },
    ],
});

export const genInterfaceRepeated = JSON.stringify({
    type: "interface",
    fields: [{ name: "tags", type: "repeated string" }],
});

export const genInterfaceRequiredOptional = JSON.stringify({
    type: "interface",
    fields: [
        { name: "id", type: "string", required: true },
        { name: "note", type: "string", required: false },
    ],
});

export const genInterfaceAmbiguousNested = JSON.stringify({
    type: "interface",
    fields: [
        {
            name: "inner",
            type: "object",
            fields: [{ name: "x", type: "dynamic" }],
        },
    ],
});

// --- DRIFT (same evidence vs changed evidence) ----------------------------

export const litRowKeysDriftSame = litRowKeys;

export const litRowKeysDriftChanged = `<?php
namespace App\\Handler;

class Report
{
    public function buildRows(): array
    {
        $res = [
            'id' => 1,
            'name' => 'x',
            'extra' => 2,
        ];
        return $res;
    }
}
`;

// --- PRIVACY SENTINELS (must never leak into safe evidence) ---------------

export const privacySentinelComment = `<?php
namespace App\\Handler;

class Secret
{
    public function f()
    {
        // PRIVACY_SENTINEL do not leak sk-12345secret
        $res = ['id' => 1];
        return $res;
    }
}
`;

export const privacySentinelStringLiteral = `<?php
namespace App\\Handler;

class Secret
{
    public function f()
    {
        $token = 'sk-abc123secret';
        $res = ['id' => 1];
        return $res;
    }
}
`;

// --- SYMBOL NOT FOUND (negative) -----------------------------------------

export const symbolNotFound = `<?php
namespace App\\Handler;

class Other
{
    public function unrelated()
    {
        return 1;
    }
}
`;

// --- PROTO finite field shape (positive) ---------------------------------

export const protoMessageFinite = `syntax = "proto3";

package ripple;

message BillingGroup {
  string id = 1;
  int64 created_at = 2;
  bool active = 3;
  repeated string tags = 4;
  Address address = 5;
}

message Address {
  string street = 1;
  int32 zip = 2;
}
`;

// --- PROTO present but NO cardinality / transport guarantee --------------

export const protoPresentNoCardinality = `syntax = "proto3";

message BillingGroupsStream {
  string cursor = 1;
  repeated GroupItem items = 2;
}

message GroupItem {
  string id = 1;
}
`;

// --- PROTO unsupported constructs (negative) -----------------------------

export const protoMapUnsupported = `syntax = "proto3";

message M {
  map<string, int32> counts = 1;
}
`;

export const protoOneofUnsupported = `syntax = "proto3";

message M {
  oneof value {
    string s = 1;
    int32 n = 2;
  }
}
`;

export const protoUnknownType = `syntax = "proto3";

message M {
  CustomType weird = 1;
}
`;

export const protoNoMessage = `syntax = "proto3";

// no message defined here
`;

// --- Deceptive static-schema contracts (negative) -------------------------

export const protoCommentOnly = `// This proto defines chunked streaming billing groups with pageSize=50
message Empty {}
`;

export const stringLiteralFakeContract =
    "id: string, name: string, amount: number";

export const genInterfaceCommentOnly = JSON.stringify({
    type: "interface",
    note: "the contract is described in this comment only",
});

/** Flat index of every fixture (name -> source text). Used by the focused
 *  matrix test for deterministic enumeration. */
export const phase14Fixtures: Readonly<Record<string, string>> = Object.freeze({
    litRowKeys,
    litRowKeysPush,
    scalarCastObject,
    scalarCastArrayOrKeys,
    branchUnionFinite,
    branchUnionNoElse,
    branchUnionUnenumerable,
    emptyNonEmptyPositive,
    emptyNonEmptyNoElse,
    aliasCopyPositive,
    aliasCopyDynamic,
    returnEnvelopePositive,
    returnEnvelopeNonAccumulator,
    runtimeDbValue,
    dynamicKeyReject,
    commentOnlyChunk,
    structuralChunkPositive,
    legacyConditionalBlob,
    grpcChunkNoMarker,
    crossServiceAssumption,
    genInterfaceFinite,
    genInterfaceMissingFields,
    genInterfaceNotJson,
    genInterfaceDynamicType,
    genInterfaceUnrecognized,
    aliasCopyCycle,
    genInterfaceNested,
    genInterfaceRepeated,
    genInterfaceRequiredOptional,
    genInterfaceAmbiguousNested,
    litRowKeysDriftSame,
    litRowKeysDriftChanged,
    privacySentinelComment,
    privacySentinelStringLiteral,
    symbolNotFound,
    protoMessageFinite,
    protoPresentNoCardinality,
    protoMapUnsupported,
    protoOneofUnsupported,
    protoUnknownType,
    protoNoMessage,
    protoCommentOnly,
    stringLiteralFakeContract,
    genInterfaceCommentOnly,
});
