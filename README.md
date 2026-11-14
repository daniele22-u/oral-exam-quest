# Oral Exam Quest

Realizza un'applicazione web interattiva e giocabile: un simulatore di esame orale universitario gamificato (ispirato al concept "Poker della Sicurezza", ma declinato come Serious Game accademico senza riferimenti al gioco d'azzardo).

Requisiti di Game Design e Funzionalità:
1. Valuta e Meccaniche Accademiche (Niente gioco d'azzardo):
- Valuta: "Crediti Fiducia" o "Punti Padronanza" (si parte con una quota iniziale per ogni seduta, accumulando crediti per convalidare la seduta).
- Dichiarazione di Sicurezza: prima di rispondere a ogni domanda aperta, lo studente dichiara il proprio livello di convinzione (es. Prudente, Solido, Senza Rete).
- Se dichiari "Senza Rete" (alta convinzione) e rispondi bene, guadagni molti più crediti, ma l'esaminatore ti mette sotto torchio con follow-up più incalzanti e rigorosi per "verificare se stai fingendo sicurezza".
- Se non conosci l'argomento, non c'è un fold definitivo: puoi dichiarare "Rinvio a Giudizio / Lacuna riconosciuta" per evitare penalità disastrose, ma l'argomento viene registrato come debito formativo nel fascicolo dello studente.

2. Struttura a Sessioni Casuali (Meccanismo stile "Capipalestra Pokémon"):
- Il percorso verso la verbalizzazione richiede di superare N partite/sedute preliminari (es. 3 sedute d'esame completate con successo).
- Ogni seduta è casuale: viene estratto a sorte un esaminatore (tra 3 archetipi: Severo, Empatico, Distratto) e vengono estratti casualmente argomenti dal programma del corso (es. Signal Processing o Neuroengineering, oppure materia personalizzata).
- Completare le N sedute preliminari sblocca l'accesso alla "Commissione Plenaria".

3. Il Boss Finale ("Il Presidente di Commissione"):
- Sbloccato dopo aver completato le sessioni preliminari.
- Il Presidente ha accesso allo storico di tutte le partite precedenti: non fa domande a caso, ma ripropone esattamente gli argomenti in cui lo studente ha avuto i punteggi più bassi o ha dichiarato una lacuna.
- Consapevolezza contestuale nei dialoghi: il Presidente esplicita il motivo della ripetizione ("So bene che con la collega ha tentennato su questo punto: le do l'occasione di riscattarsi"). Se lo studente commenta o protesta, il docente risponde a tono mantenendo il personaggio.

4. Dialogo Orale Interattivo e Valutazione AI:
- Ogni domanda prevede uno scambio aperto con 2-4 follow-up dell'esaminatore in chat.
- Sistema di scoring strutturato (accuratezza scientifica, completezza, tenuta logica).
- Modalità demo interattiva e funzionante anche senza chiavi API esterne (con scenari e domande predefinite per Signal Processing e Neuroengineering), pronta per essere agganciata a Lovable AI / Supabase.

5. Report Finale e Revisione Completa:
- A fine esame, un report interattivo e navigabile mostra: voto finale, indice di calibrazione della sicurezza, e una timeline espandibile di ogni domanda affrontata con trascrizione della risposta dello studente, obiezioni del docente e spiegazione modello dell'argomento.

Visual design raffinato: atmosfera universitaria prestigiosa (verde foresta profondo, ardesia e accenti oro/ottone), elegante e accademica.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7355886e-65bd-4b79-a131-73a5ae740963).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
