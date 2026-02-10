import { Users } from 'lucide-react';

export default function LeadershipList({ title, members }) {
  return (
    <div className="leadership-list">
      <h3 className="leadership-list__title">
        <Users size={16} />
        {title}
      </h3>
      <ul>
        {members.map((m, i) => (
          <li key={i} className="leadership-list__item">
            <span className="leadership-list__role">{m.name}</span>
            <span className="leadership-list__person">{m.person}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
