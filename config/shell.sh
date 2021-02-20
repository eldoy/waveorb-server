# Systemctl short cuts
alias s="systemctl"
alias status="systemctl status"
alias start="systemctl start"
alias restart="systemctl restart"
alias enable="systemctl enable"
alias disable="systemctl disable"

# Journalctl short cuts
alias j="journalctl"
alias ju="journalctl -u"

# Git short cuts
unalias g
function g() {
  git add --all && git commit -m "$1" && git push
}
alias gs="git status"
alias ga="git add ."
alias gaa="git add --all"
alias gc="git commit"
alias gl="git log"
alias gd="git diff"
alias gp="git push"
alias gpf="git push --force"
alias gu="git pull"
alias gur="git pull --rebase"
