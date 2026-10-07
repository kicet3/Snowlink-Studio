import { Icon } from './Icon';

export function ProductDetails({ workflow, details }) {
  return <div className="company-product-details">
    <section className="company-workflow" aria-labelledby="workflow-title">
      <div className="company-detail-heading"><p className="eyebrow">HOW IT WORKS</p><h3 id="workflow-title">한 편의 콘텐츠가 만들어지는 흐름</h3><p>기획에 모은 캐릭터와 이야기를 장면 제작과 컷 편집에 이어 사용합니다.</p></div>
      <ol>{workflow.map((step, index) => <li key={step.title}><span className="company-step-number">0{index + 1}</span><h4>{step.title}</h4><p>{step.description}</p></li>)}</ol>
    </section>
    <section className="company-detail-section" aria-labelledby="details-title">
      <div className="company-detail-heading"><p className="eyebrow">MADE FOR YOUR PROCESS</p><h3 id="details-title">작업의 각 단계에서 할 수 있는 일</h3></div>
      <div className="company-detail-grid">{details.map((detail, index) => <article key={detail.title}>
        <div className="company-detail-index"><span>0{index + 1} /</span><Icon name={detail.icon}/></div>
        <h4>{detail.title}</h4><p>{detail.description}</p>
        <ul>{detail.points.map(point => <li key={point}>{point}</li>)}</ul>
      </article>)}</div>
    </section>
  </div>;
}
