import { cookies } from 'next/headers';
import { UnitForm } from './unit-form';
import { OperationsForms } from './operations-forms';
import { AttendanceForm } from './attendance-form';
import { sessionRoles } from '../lib/session';
export default async function Home(): Promise<React.JSX.Element> {
  const authenticated = (await cookies()).has('company_os_session');
  const roles = authenticated ? await sessionRoles() : [];
  return (
    <main>
      <header>
        <p className="eyebrow">Company OS</p>
        <h1>会社運営の統制コンソール</h1>
        <p>権限・監査・適用日を一つの業務記録として扱います。</p>
      </header>
      {authenticated ? (
        <>
          <nav aria-label="アカウント">
            <a href="/auth/logout">ログアウト</a>
          </nav>
          <UnitForm />
          <AttendanceForm
            canReview={roles.includes('workforce-manager') || roles.includes('workforce-hr')}
            canManagePeriods={roles.includes('workforce-hr')}
          />
          <OperationsForms />
        </>
      ) : (
        <section aria-labelledby="sign-in">
          <h2 id="sign-in">安全に始める</h2>
          <p>Keycloakで認証し、割り当てられたtenantとroleの範囲だけを操作できます。</p>
          <a className="button" href="/auth/login">
            ログイン
          </a>
        </section>
      )}
    </main>
  );
}
