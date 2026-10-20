import json,re,sys
IT=re.compile(r"\b(di|il|lo|gli|della|delle|dei|degli|dello|nel|nella|sul|sulla|dal|dalla|per|che|non|più|anche|sono|questo|questa|quando|dopo|prima|ogni|tuo|tua|tuoi|tue|puoi|vuoi|fai|hai|qui|sotto|sopra|ancora|nessun[ao]?|senza|oppure|allenament[oi]|sedut[ae]|sched[ae]|esercizi[o]?|giorn[oi]|settiman[ae]|recupero|obiettivo|cibi|past[oi]|grassi|proteine|carboidrati|uscit[ae]|corsa|corse|passi|sonno|battito|ripetizioni|carico|tocca|aggiungi|salva|elimina|crea|scegli|fatt[oae]|intestazioni|ottieni|dettagli|poi|oggi|ieri|domani|volte|chilometri|minuti|ore|alla|alle|agli|ai|col|coi|nelle|negli|sei|ha|ti|mi|si|ci|vi|ne|questi|quelle|quello|quella|tutto|tutti|tutte|poco|molto|bene|meglio|peggio|niente|nulla|ecco|così|perché|cioè|circa|almeno|solo|già|mai|sempre|ancora|bisogno|valori|valore|dati|media|ultim[aoie]|manca|mancano|stima|stimat[oaie])\b", re.I)
lang=sys.argv[1]
m=json.load(open(f'i18n/miss_{lang}.json'))
k=[x for x in m if IT.search(x)]
json.dump(k,open(f'i18n/missf_{lang}.json','w'),ensure_ascii=False,indent=0)
print(len(k))
for x in k: print(x[:200])
