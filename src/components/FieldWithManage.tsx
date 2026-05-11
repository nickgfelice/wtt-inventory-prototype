export default function FieldWithManage(props: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  onManage: () => void;
  optional?: boolean;
}) {
  const { label, value, options, placeholder, onChange, onManage, optional } = props;

  return (
    <div className="form-section">
      <div className="field-header">
        <label>{label}</label>
        <button type="button" className="text-button" onClick={onManage}>
          Manage
        </button>
      </div>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {optional && <option value="">{placeholder}</option>}
        {!optional && options.length === 0 && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
