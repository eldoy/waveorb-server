# zsh config
PROMPT='%F{240}%n%F{red}@%F{green}%m:%F{green}%~$ %F{reset}'
export SAVEHIST=100
export HISTFILE=~/.zsh_history
setopt HIST_IGNORE_ALL_DUPS
setopt INC_APPEND_HISTORY
bindkey '\e[A' history-beginning-search-backward
bindkey '\e[B' history-beginning-search-forward
bindkey -e

# ls short cuts
alias ls='ls --color=auto'
alias l='ls'
alias ll='ls -la'
alias l.='ls -d .*'

# Systemctl short cuts
alias s="systemctl"
alias status="systemctl status"
alias start="systemctl start"
alias restart="systemctl restart"
alias enable="systemctl enable"
alias disable="systemctl disable"
alias reload="systemctl daemon-reload"

# Journalctl short cuts
alias j="journalctl -e"
alias log="journalctl -e -u"

# Git short cuts
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

# Other aliases
alias src="source ~/.zshrc"
alias zs="vim ~/.zshrc && src"
