import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { storage } from "./storage";

export function startSmtpServer(port: number = 2525) {
  const server = new SMTPServer({
    // Disable authentication
    authOptional: true,
    
    // Accept messages for any recipient
    onRcptTo(address, session, callback) {
      // Logic to accept all emails
      // in a real world app you might want to check the domain
      // e.g. if (address.address.endsWith('@mydomain.com')) ...
      return callback(); 
    },

    // Handle the message stream
    onData(stream, session, callback) {
      simpleParser(stream, async (err, parsed) => {
        if (err) {
          console.error("Error parsing email:", err);
          return callback(new Error("Error parsing email"));
        }

        try {
          // Extract the first recipient's local part as the inbox
          // In reality, an email can have multiple RCPT TO, but simpleParser 
          // usually gives headers. We should rely on the session envelope if possible,
          // but for simplicity here we'll process it for *each* recipient in the envelope
          // or just pick the 'To' header. 
          
          // Better approach: The SMTPServer `session.envelope.rcptTo` contains the actual recipients.
          // We should duplicate the email for each recipient inbox.
          
          const recipients = session.envelope.rcptTo;
          
          for (const recipient of recipients) {
            // recipient is { address: 'user@domain.com', args: ... }
            const address = recipient.address;
            const inbox = address.split('@')[0]; // Simple local-part extraction

            if (inbox) {
              await storage.createEmail({
                inbox: inbox.toLowerCase(),
                sender: session.envelope.mailFrom ? session.envelope.mailFrom.address : 'unknown',
                subject: parsed.subject || '(No Subject)',
                bodyText: parsed.text || '',
                bodyHtml: parsed.html as string || '', // Type assertion as it can be boolean false
              });
              console.log(`Stored email for inbox: ${inbox}`);
            }
          }
          
          return callback();
        } catch (storageError) {
          console.error("Error storing email:", storageError);
          return callback(new Error("Internal storage error"));
        }
      });
    }
  });

  server.on("error", (err) => {
    console.error("SMTP Server Error:", err);
  });

  server.listen(port, () => {
    console.log(`SMTP Server listening on port ${port}`);
  });

  return server;
}
