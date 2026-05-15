


export default function LeadnotePage({ params }: { params: { leadId: string } }) {
    return (
        <div>
            <h1>Lead Detail — {params.leadId}</h1>
        </div>
    );
}