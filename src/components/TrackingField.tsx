export default function TrackingField(props: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="form-section">
      <label>Needs to be tracked?</label>
      <div className="radio-group tracking-group">
        <label className="choice-card">
          <input
            type="radio"
            name="tracking"
            checked={props.value}
            onChange={() => props.onChange(true)}
          />
          <span>
            <strong>Yes, this item needs to be tracked</strong>
            <small>Staff can check this item in and out as usual.</small>
          </span>
        </label>
        <label className="choice-card">
          <input
            type="radio"
            name="tracking"
            checked={!props.value}
            onChange={() => props.onChange(false)}
          />
          <span>
            <strong>No, this item does not need to be tracked</strong>
            <small>Check In and Check Out will be unavailable for this item.</small>
          </span>
        </label>
      </div>
    </div>
  );
}
