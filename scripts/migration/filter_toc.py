#!/usr/bin/env python3
"""Filter a `pg_restore -l` listing of the Lovable Cloud export.

Usage: filter_toc.py main|extras|acl < full.list > filtered.list

main:   everything in schema public (tables, types, functions, data,
        constraints, indexes, triggers, RLS, policies, comments), plus the
        auth users/identities data (password hashes included).
        Supabase-managed schemas (auth, storage, realtime, cron, vault,
        pgmq...) already exist in a fresh project and are NOT recreated.
extras: the on_auth_user_created trigger and the storage.objects policies.
acl:    the GRANT/REVOKE entries of schema public, applied separately so
        grants to roles that only exist on Lovable can be stripped out.
"""
import re
import sys

DESCS = sorted(
    [
        "TABLE DATA", "TABLE", "FK CONSTRAINT", "CONSTRAINT", "INDEX",
        "TRIGGER", "EVENT TRIGGER", "POLICY", "ROW SECURITY", "FUNCTION",
        "PROCEDURE", "AGGREGATE", "TYPE", "DOMAIN", "SEQUENCE SET",
        "SEQUENCE OWNED BY", "SEQUENCE", "DEFAULT ACL", "DEFAULT", "ACL",
        "COMMENT", "VIEW", "MATERIALIZED VIEW DATA", "MATERIALIZED VIEW",
        "SCHEMA", "EXTENSION", "PUBLICATION TABLE", "PUBLICATION",
    ],
    key=len,
    reverse=True,
)
LINE = re.compile(r"^(\d+);\s+\d+\s+\d+\s+(.*)$")

AUTH_DATA = {"users", "identities"}


def parse(line):
    m = LINE.match(line)
    if not m:
        return None
    rest = m.group(2)
    for d in DESCS:
        if rest.startswith(d + " "):
            parts = rest[len(d) + 1:].split(" ", 1)
            schema = parts[0]
            name = parts[1].rsplit(" ", 1)[0] if len(parts) > 1 else ""
            return d, schema, name
    return None


def keep_main(desc, schema, name):
    if schema == "public":
        return desc not in {"ACL", "DEFAULT ACL", "SCHEMA", "EXTENSION"}
    return schema == "auth" and desc == "TABLE DATA" and name in AUTH_DATA


def keep_extras(desc, schema, name):
    # Objects on Supabase-owned tables: applied in a separate, non-atomic pass.
    if schema == "auth" and desc == "TRIGGER":
        return name.startswith("users on_auth_user_created")
    return schema == "storage" and desc == "POLICY"


def keep_acl(desc, schema, name):
    return desc == "ACL" and schema == "public"


def main():
    mode = sys.argv[1]
    keep = {"main": keep_main, "extras": keep_extras, "acl": keep_acl}[mode]
    kept = 0
    for line in sys.stdin:
        line = line.rstrip("\n")
        if not line or line.startswith(";"):
            continue
        p = parse(line)
        if p and keep(*p):
            print(line)
            kept += 1
    print(f"{mode}: kept {kept} entries", file=sys.stderr)


if __name__ == "__main__":
    main()
