import Link from 'next/link';
export const metadata = { title: 'Event registration privacy' };
export default function Page() {
  return (
    <article className="card prose">
      <Link className="back-link" href="/">
        ‹ Back to registration
      </Link>
      <h1>Event registration privacy</h1>
      <p>
        This event portal collects the details you provide to coordinate your attendance at the OAK
        Foundation Partner Convening.
      </p>
      <h2>Information collected</h2>
      <p>
        Your name, organisation, role, email and phone number are required. Programme area, dietary,
        accessibility, travel and accommodation requirements are optional. Only provide requirements
        you want the event team to use.
      </p>
      <h2>How information is used</h2>
      <p>
        Registration details support event planning and your entry pass. Authorised event staff can
        check you in and monitor attendance. Requirements are used to help arrange your
        participation.
      </p>
      <h2>Your entry pass and notes</h2>
      <p>
        A separate registration session is stored in an essential HttpOnly browser cookie for 30
        days. Partners receive an entry QR code; keep it private. Personal session notes are
        available only to their owner through the programme page. When email delivery is configured,
        Partners receive registration details and an attached QR code through the event's email
        provider.
      </p>
      <h2>Questions and requests</h2>
      <p>
        Contact the event coordination team at the registration desk for questions, corrections,
        withdrawal of consent or deletion requests.
      </p>
      <p className="status">
        This notice is a draft for the project owner to review before collecting real registrations.
        The source ZIP did not include an approved privacy notice, retention period or privacy
        contact.
      </p>
    </article>
  );
}
