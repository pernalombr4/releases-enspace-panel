"""Hook PreToolUse (Bash) dos repositórios da redatora no GitHub: barra commit, PR e push com o Claude como coautor.

Regra da redatora de 2026-10-20 (agentes-base/regras/github.md): nenhum commit nem PR no GitHub dela leva
"Co-Authored-By" do Claude ou outra linha que coloque o Claude como coautor, venha a sessão da nuvem ou da máquina.

Não se roda à mão. O `bin/github_sem_coautor.py` copia este arquivo para `.claude/hooks/sem_coautor.py` de cada
repositório e liga o hook no `.claude/settings.json` dele, que a sessão na nuvem também lê. Barra (código 2):
- `git commit`, `git commit-tree`, `git merge`, `git tag` e `gh pr create|edit` com o coautor no comando ou no
  arquivo de `-F`/`--file`/`--body-file`;
- `git push` quando algum commit que vai subir tem o coautor.
Sem Python de terceiros; roda no Windows e no Linux.
"""
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

COAUTOR = re.compile(r"co-authored-by:[^\n]*(claude|anthropic)|noreply@anthropic\.com", re.I)
ESCRITA = re.compile(r"\bgit\s+(?:-C\s+\S+\s+)?(commit|commit-tree|merge|tag)\b|\bgh\s+pr\s+(create|edit)\b")
PUSH = re.compile(r"\bgit\s+(?:-C\s+(\S+)\s+)?push\b")
AVISO = ("Barrado: o Claude não entra como coautor em commit nem PR no GitHub da redatora (regra de 2026-10-20, "
         "agentes-base/regras/github.md). Tire a linha Co-Authored-By (e qualquer outra que ponha o Claude como "
         "coautor) e refaça.")


def arquivos_de_mensagem(cmd):
    try:
        partes = shlex.split(cmd, posix=True)
    except ValueError:
        partes = cmd.split()
    out = []
    for i, p in enumerate(partes):
        if p in ("-F", "--file", "--body-file") and i + 1 < len(partes):
            out.append(partes[i + 1])
        elif p.startswith(("--file=", "--body-file=")):
            out.append(p.split("=", 1)[1])
    return out


def push_com_coautor(cmd, cwd):
    m = PUSH.search(cmd)
    pasta = m.group(1) or cwd
    for faixa in ("@{upstream}..HEAD", "origin/HEAD..HEAD"):
        r = subprocess.run(["git", "-C", pasta, "log", "--format=%H%n%B", faixa], capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        if r.returncode == 0:
            return bool(COAUTOR.search(r.stdout))
    r = subprocess.run(["git", "-C", pasta, "log", "-50", "--format=%B", "HEAD"], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return False if r.returncode else bool(COAUTOR.search(r.stdout))


def main():
    try:
        dado = json.load(sys.stdin)
    except ValueError:
        return 0
    cmd = (dado.get("tool_input") or {}).get("command") or ""
    cwd = dado.get("cwd") or "."
    if ESCRITA.search(cmd):
        texto = cmd
        for f in arquivos_de_mensagem(cmd):
            p = Path(f) if Path(f).is_absolute() else Path(cwd) / f
            try:
                texto += "\n" + p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                pass
        if COAUTOR.search(texto):
            print(AVISO, file=sys.stderr)
            return 2
    if PUSH.search(cmd) and push_com_coautor(cmd, cwd):
        print(AVISO + " Algum commit que ia subir já tem a linha: reescreva a mensagem (git commit --amend ou "
              "rebase) antes do push.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
