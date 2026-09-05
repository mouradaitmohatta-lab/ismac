#!/bin/bash
cd "$(dirname "$0")"

echo "========================================================"
echo "  Application ISMAC — Gestion Logistique & Décharges"
echo "========================================================"
echo ""

# Vérifier si python3 et python-docx sont prêts
if ! python3 -c "import docx" > /dev/null 2>&1; then
    echo "Installation de la dépendance Word (python-docx)..."
    pip3 install python-docx > /dev/null 2>&1 || pip install python-docx > /dev/null 2>&1
fi

echo "Démarrage du serveur..."
python3 server.py &
SERVER_PID=$!
sleep 2

# Vérifier si le serveur a démarré
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    URL="http://localhost:8080"
    echo "Serveur démarré avec succès !"
else
    echo "Note : Ouverture directe du fichier autonome dans le navigateur..."
    URL="ismac_app_direct.html"
fi

if which xdg-open > /dev/null 2>&1; then
  xdg-open "$URL"
elif which open > /dev/null 2>&1; then
  open "$URL"
else
  echo "Veuillez ouvrir votre navigateur à l'adresse : $URL"
fi

echo ""
echo "Appuyez sur Entrée pour quitter..."
read
kill $SERVER_PID 2>/dev/null
