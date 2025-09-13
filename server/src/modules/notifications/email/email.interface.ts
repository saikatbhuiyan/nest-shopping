export interface IEmail {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}
