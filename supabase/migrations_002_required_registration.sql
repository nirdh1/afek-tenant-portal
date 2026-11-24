-- כל שדות טופס ההרשמה חובה
alter table registration_requests
  alter column email   set not null,
  alter column phone   set not null,
  alter column address set not null;
