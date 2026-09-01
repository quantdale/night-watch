// ---------------------------------------------------------------------------
// C-06 test support — a minimal, provable PHP route pipeline.
//
// After C-06 a route's read-only proof is rooted at its RESOLVED middleware
// pipeline. A synthetic repository that means its GET routes to be provable
// must therefore declare a route provider and its middleware, exactly as the
// real application does. Fixtures that omit this are not "read-only": they are
// "pipeline unresolved", which fails closed.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';

/** Routing-table lines that enable the single `header` flag by default. */
export const PIPELINE_DEFAULT_CONFIG_LINES: readonly string[] = ['default_config:', '  middleware:', '    header: true'];

const ROUTE_PROVIDER = `<?php
namespace App\\Route\\Providor;

use App\\Route\\Middleware\\HeaderMiddleware;

class RouteProvidor
{
    public function __construct($app)
    {
        $set_header = new HeaderMiddleware();
        foreach ($mw['middleware'] as $mk => $mv) {
            if ($mk == "header" && $mv && $set_header) {
                $rg->add($set_header);
            }
        }
    }
}
`;

const HEADER_MIDDLEWARE = `<?php
namespace App\\Route\\Middleware;

class HeaderMiddleware
{
    public function __invoke($request, $response, $next)
    {
        return json_encode(array('ok' => true));
    }
}
`;

/** Install a route provider whose whole pipeline is one pure middleware. */
export function installReadOnlyPipeline(repoDir: string): void {
  fs.mkdirSync(path.join(repoDir, 'src', 'App', 'Route', 'Providor'), { recursive: true });
  fs.mkdirSync(path.join(repoDir, 'src', 'App', 'Route', 'Middleware'), { recursive: true });
  fs.writeFileSync(path.join(repoDir, 'src', 'App', 'Route', 'Providor', 'RouteProvidor.php'), ROUTE_PROVIDER);
  fs.writeFileSync(path.join(repoDir, 'src', 'App', 'Route', 'Middleware', 'HeaderMiddleware.php'), HEADER_MIDDLEWARE);
}
