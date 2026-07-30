import paramiko
import sys
import time

host = "20.91.240.54"
user = "azureuser"
password = "azureuserSami@11095"

print(f"Connecting via Python Paramiko SSH to {user}@{host}...")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(
        host,
        port=22,
        username=user,
        password=password,
        timeout=60,
        banner_timeout=60,
        auth_timeout=60,
        look_for_keys=False,
        allow_agent=False
    )
    print("SSH Connection established successfully!")

    cmd = (
        "echo 'azureuserSami@11095' | sudo -S ufw allow 3000/tcp && "
        "echo 'azureuserSami@11095' | sudo -S bash -c '"
        "cd /root/egx-stock-bot && "
        "git checkout -- package-lock.json && "
        "git pull && "
        "cd frontend && npm install --legacy-peer-deps && npm run build && "
        "cd .. && npm run build && "
        "pm2 restart egx-stock-bot && pm2 status'"
    )

    print("Executing remote deployment script on Azure VM...")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)

    for line in iter(stdout.readline, ""):
        print(line, end="")

    print("\nRemote deployment completed successfully!")

except Exception as e:
    print(f"SSH Error: {e}")
finally:
    ssh.close()
